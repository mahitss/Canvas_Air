import { ModuleRegistry } from "../registry/module_registry";
import { AiTask, AiModule } from "../types";
import { LoadBalancer, LoadBalancerStrategy } from "./load_balancer";

export interface RoutingPolicy {
  strategy: LoadBalancerStrategy;
  minVersion?: string; // e.g. "1.1.0"
  maxLatencyMs?: number; // bypass high-latency providers
  allowDegraded?: boolean;
}

export class EngineRouter {
  private readonly registry: ModuleRegistry;
  private readonly balancer = new LoadBalancer();
  private readonly fallbackRegistry = new Map<string, string>(); // capability -> fallbackCapability
  private readonly policies = new Map<string, RoutingPolicy>(); // capability -> RoutingPolicy

  constructor(registry: ModuleRegistry) {
    this.registry = registry;
  }

  public registerFallback(capability: string, fallbackCapability: string): void {
    this.fallbackRegistry.set(capability, fallbackCapability);
  }

  public registerPolicy(capability: string, policy: RoutingPolicy): void {
    this.policies.set(capability, policy);
  }

  public getLoadBalancer(): LoadBalancer {
    return this.balancer;
  }

  /**
   * Routes task request to optimal provider using policies, health, latency, and load balancers.
   * Recovers via fallbacks if execution fails.
   */
  public async routeRequest(
    capability: string,
    task: AiTask,
    executor: (mod: AiModule, t: AiTask) => Promise<any>
  ): Promise<any> {
    const providers = this.registry.getModulesByCapability(capability);
    const policy = this.policies.get(capability) ?? { strategy: "HealthAware", allowDegraded: true };

    // 1. Filter candidates based on Routing Policy constraints
    let candidates = [...providers];

    // Filter by health status
    if (policy.allowDegraded === false) {
      candidates = candidates.filter((p) => p.status === "healthy");
    } else {
      candidates = candidates.filter((p) => p.status === "healthy" || p.status === "degraded");
    }

    // Filter by version compatibility
    if (policy.minVersion) {
      const minV = policy.minVersion;
      candidates = candidates.filter((p) => {
        const v = p.version ?? "1.0.0";
        return this.compareVersions(v, minV);
      });
    }

    // Filter by max latency limits
    if (policy.maxLatencyMs) {
      const maxL = policy.maxLatencyMs;
      candidates = candidates.filter((p) => {
        const stats = this.balancer.getStats(p.name);
        const lat = stats.averageLatencyMs > 0 ? stats.averageLatencyMs : (p.metadata?.latencyScoreMs ?? 0);
        return lat <= maxL;
      });
    }

    // 2. Load balance remaining candidates
    const selected = this.balancer.selectProvider(capability, candidates, policy.strategy);

    if (!selected) {
      // Fallback pipeline recovery
      const fbCap = this.fallbackRegistry.get(capability);
      if (fbCap) {
        return this.routeRequest(fbCap, task, executor);
      }
      throw new Error(`No compatible module found for capability: ${capability}`);
    }

    // 3. Track provider lifecycle load and latency
    this.balancer.incrementLoad(selected.name);
    const tStart = Date.now();

    try {
      const result = await executor(selected, task);
      const latency = Date.now() - tStart;
      this.balancer.decrementLoad(selected.name, latency);
      return result;
    } catch (err) {
      this.balancer.decrementLoad(selected.name);

      // Attempt fallback recovery pipeline if registered
      const fbCap = this.fallbackRegistry.get(capability);
      if (fbCap) {
        try {
          return await this.routeRequest(fbCap, task, executor);
        } catch (fallbackError) {
          throw new Error(`Primary and fallback routing failed. Fallback error: ${(fallbackError as any).message || fallbackError}`);
        }
      }
      throw err;
    }
  }

  /**
   * Helper function comparing versions: returns true if v1 >= v2.
   */
  private compareVersions(v1: string, v2: string): boolean {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] ?? 0;
      const p2 = parts2[i] ?? 0;
      if (p1 > p2) return true;
      if (p1 < p2) return false;
    }
    return true; // equal
  }
}
export * from "../types";
export * from "../config";
export * from "./load_balancer";
