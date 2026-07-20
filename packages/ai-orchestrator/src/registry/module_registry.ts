import { AiModule } from "../types";
import { IAiModuleRegistry } from "../interfaces";

export class ModuleRegistry implements IAiModuleRegistry {
  private readonly modules: Map<string, AiModule> = new Map();
  // Cache lookups by capability to save list iteration allocations in the scheduler hot-path
  private readonly cache = new Map<string, AiModule[]>();

  /**
   * Registers a dynamic AI module provider capability.
   */
  public register(module: AiModule): void {
    if (!module.name) {
      throw new Error("Cannot register module without a valid name.");
    }
    
    module.priority = module.priority ?? 0;
    module.version = module.version ?? "1.0.0";
    module.status = module.status ?? "healthy";
    module.metadata = module.metadata ?? {};

    this.modules.set(module.name, module);
    this.cache.clear(); // invalidate cache
  }

  /**
   * Unregisters a registered module.
   */
  public unregister(name: string): void {
    this.modules.delete(name);
    this.cache.clear(); // invalidate cache
  }

  /**
   * Retrieves a registered module by its unique name.
   */
  public getModule(name: string): AiModule | undefined {
    return this.modules.get(name);
  }

  /**
   * Discovers and retrieves a registered module supporting the required capability name.
   * Prioritizes healthy modules and sorts them by priority descending.
   */
  public getModuleForCapability(capability: string): AiModule | undefined {
    const matched = this.getModulesByCapability(capability);
    return matched.find((mod) => mod.status === "healthy") ?? matched[0];
  }

  /**
   * Retrieves all modules supporting a capability, sorted by priority (descending).
   * Employs O(1) cache memory reuse.
   */
  public getModulesByCapability(capability: string): AiModule[] {
    const cached = this.cache.get(capability);
    if (cached) {
      return cached;
    }

    const list: AiModule[] = [];
    for (const mod of this.modules.values()) {
      if (mod.capabilities.includes(capability)) {
        list.push(mod);
      }
    }

    // Sort by priority (higher numbers denotate higher priorities preference)
    const sorted = list.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.cache.set(capability, sorted);
    return sorted;
  }

  /**
   * Returns names of all registered modules.
   */
  public getAvailableModules(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Dispatches parallel health status validation checks and updates status.
   */
  public async runHealthCheck(): Promise<Record<string, boolean>> {
    const statuses: Record<string, boolean> = {};
    const checks: Promise<void>[] = [];

    for (const [name, mod] of this.modules.entries()) {
      checks.push(
        mod.healthCheck()
          .then(result => {
            statuses[name] = result;
            mod.status = result ? "healthy" : "unhealthy";
          })
          .catch(() => {
            statuses[name] = false;
            mod.status = "unhealthy";
          })
      );
    }

    await Promise.all(checks);
    this.cache.clear(); // invalidate cache after health changes
    return statuses;
  }
}
