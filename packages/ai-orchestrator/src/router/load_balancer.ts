import { AiModule } from "../types";

export type LoadBalancerStrategy = "RoundRobin" | "Weighted" | "LeastBusy" | "LatencyBased" | "HealthAware";

export class LoadBalancer {
  private readonly roundRobinIndices = new Map<string, number>();
  private readonly activeLoads = new Map<string, number>(); // providerName -> activeCount
  private readonly averageLatencies = new Map<string, number>(); // providerName -> averageLatencyMs

  public incrementLoad(providerName: string): void {
    this.activeLoads.set(providerName, (this.activeLoads.get(providerName) ?? 0) + 1);
  }

  public decrementLoad(providerName: string, latencyMs?: number): void {
    this.activeLoads.set(providerName, Math.max(0, (this.activeLoads.get(providerName) ?? 0) - 1));
    if (latencyMs !== undefined) {
      const curAvg = this.averageLatencies.get(providerName) ?? 0;
      if (curAvg === 0) {
        this.averageLatencies.set(providerName, latencyMs);
      } else {
        this.averageLatencies.set(providerName, curAvg * 0.8 + latencyMs * 0.2); // exponential moving average
      }
    }
  }

  /**
   * Evaluates active providers and selects the optimal candidate based on Strategy algorithms.
   */
  public selectProvider(
    capability: string,
    providers: AiModule[],
    strategy: LoadBalancerStrategy
  ): AiModule | undefined {
    if (providers.length === 0) return undefined;

    // Filter out degraded or unhealthy providers for strategy evaluation
    const healthy = providers.filter(p => p.status === "healthy");
    const candidates = healthy.length > 0 ? healthy : providers;

    switch (strategy) {
      case "RoundRobin": {
        const idx = this.roundRobinIndices.get(capability) ?? 0;
        const chosen = candidates[idx % candidates.length]!;
        this.roundRobinIndices.set(capability, idx + 1);
        return chosen;
      }
      case "Weighted": {
        // Priority maps to weight. Higher priority denotes higher choice probability
        const totalWeight = candidates.reduce((sum, p) => sum + Math.max(1, p.priority ?? 1), 0);
        let rand = Math.random() * totalWeight;
        for (const p of candidates) {
          const w = Math.max(1, p.priority ?? 1);
          rand -= w;
          if (rand <= 0) return p;
        }
        return candidates[0];
      }
      case "LeastBusy": {
        return candidates.reduce((best, cur) => {
          const loadBest = this.activeLoads.get(best.name) ?? 0;
          const loadCur = this.activeLoads.get(cur.name) ?? 0;
          return loadCur < loadBest ? cur : best;
        });
      }
      case "LatencyBased": {
        return candidates.reduce((best, cur) => {
          const latBest = this.averageLatencies.get(best.name) ?? (best.metadata?.latencyScoreMs ?? 100);
          const latCur = this.averageLatencies.get(cur.name) ?? (cur.metadata?.latencyScoreMs ?? 100);
          return latCur < latBest ? cur : best;
        });
      }
      case "HealthAware":
      default: {
        const sorted = [...candidates].sort((a, b) => {
          const score = (s?: string) => s === "healthy" ? 3 : s === "degraded" ? 2 : 1;
          return score(b.status) - score(a.status);
        });
        return sorted[0];
      }
    }
  }

  public getStats(providerName: string) {
    return {
      activeLoad: this.activeLoads.get(providerName) ?? 0,
      averageLatencyMs: this.averageLatencies.get(providerName) ?? 0
    };
  }
}
export * from "../types";
export * from "../config";
