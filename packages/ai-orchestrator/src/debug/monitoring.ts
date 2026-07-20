import { ModuleRegistry } from "../registry/module_registry";
import { TaskScheduler } from "../scheduler/task_scheduler";

export class AiMonitoringService {
  private totalExecutionTimeMs = 0;
  private totalTasksCount = 0;

  constructor(
    private readonly registry: ModuleRegistry,
    private readonly scheduler: TaskScheduler
  ) {}

  public recordExecution(timeMs: number): void {
    this.totalExecutionTimeMs += timeMs;
    this.totalTasksCount++;
  }

  /**
   * Evaluates active registry and scheduler telemetry to compile unified health/usage metrics.
   */
  public getMetrics() {
    const stats = this.scheduler.getStats();
    
    // Get provider health mapping from registry
    const providerHealth: Record<string, string> = {};
    const modules = this.registry.getAvailableModules();
    for (const name of modules) {
      const mod = this.registry.getModule(name);
      providerHealth[name] = mod?.status ?? "unknown";
    }

    // Capture dynamic system usage diagnostics (Node.js process metrics)
    const proc = (globalThis as any).process;
    const memUsage = proc && proc.memoryUsage 
      ? proc.memoryUsage().heapUsed 
      : 0;

    const cpuUsage = proc && proc.cpuUsage
      ? proc.cpuUsage().user / 1000 // user CPU time in ms
      : 0;

    const total = stats.totalProcessed || 1;
    const successRate = stats.successCount / total;
    const errorRate = stats.failureCount / total;

    return {
      taskLatencyMs: stats.averageLatencyMs,
      queueLength: stats.pending,
      providerHealth,
      successRate,
      errorRate,
      totalExecutionTimeMs: this.totalExecutionTimeMs,
      systemCpuUsageMs: cpuUsage,
      systemMemoryHeapUsed: memUsage
    };
  }
}
export * from "../types";
export * from "../config";
export * from "../registry/module_registry";
export * from "../scheduler/task_scheduler";
