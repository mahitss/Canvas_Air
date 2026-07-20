import { ModuleRegistry } from "./registry/module_registry";
import { TaskScheduler } from "./scheduler/task_scheduler";
import { EngineRouter } from "./router/engine_router";
import { AiTask, AiModule, TaskPriority, OrchestratorMetrics, OrchestratorConfig } from "./types";
import { DEFAULT_ORCHESTRATOR_CONFIG } from "./config";

export class AiOrchestrator {
  private config: OrchestratorConfig;
  private registry: ModuleRegistry;
  private scheduler: TaskScheduler;
  private router: EngineRouter;
  
  private isProcessing: boolean = false;
  private processIntervalId: any = null;

  constructor(config: OrchestratorConfig = DEFAULT_ORCHESTRATOR_CONFIG) {
    this.config = config;
    this.registry = new ModuleRegistry();
    this.scheduler = new TaskScheduler();
    this.router = new EngineRouter(this.registry);
    
    this.startWorkerLoop();
  }

  public setConfig(config: OrchestratorConfig): void {
    this.config = config;
    this.restartWorkerLoop();
  }

  public registerModule(module: AiModule): void {
    this.registry.register(module);
  }

  public unregisterModule(name: string): void {
    this.registry.unregister(name);
  }

  public registerFallback(capability: string, fallbackCapability: string): void {
    this.router.registerFallback(capability, fallbackCapability);
  }

  public getAvailableModules(): string[] {
    return this.registry.getAvailableModules();
  }

  /**
   * Submits an AI task request to the priority scheduler queue.
   * Returns a promise that resolves with the final execution result.
   */
  public async submitTask(
    name: string,
    capability: string,
    priority: TaskPriority,
    payload: any,
    options?: {
      timeoutMs?: number;
      retryLimit?: number;
      dependencies?: string[];
    }
  ): Promise<any> {
    void capability;
    const id = `task-${Math.random().toString(36).substr(2, 9)}`;
    const task: AiTask = {
      id,
      name,
      priority,
      payload,
      status: "pending",
      timeoutMs: options?.timeoutMs ?? 5000,
      retryLimit: options?.retryLimit ?? 3,
      retryCount: 0,
      dependencies: options?.dependencies ?? [],
      createdAt: Date.now()
    };

    this.scheduler.enqueue(task);
    this.triggerProcessing();

    // Return a promise that resolves when the task status completes
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const t = this.scheduler.getTask(id);
        if (!t) {
          clearInterval(checkInterval);
          reject(new Error(`Task ${id} could not be retrieved from scheduler.`));
          return;
        }

        if (t.status === "completed") {
          clearInterval(checkInterval);
          resolve(t.result);
        } else if (t.status === "failed") {
          clearInterval(checkInterval);
          reject(new Error(t.error || "Task execution failed."));
        } else if (t.status === "cancelled") {
          clearInterval(checkInterval);
          reject(new Error("Task execution was cancelled."));
        }
      }, 5);
    });
  }

  public cancelTask(id: string): void {
    this.scheduler.cancel(id);
  }

  public getTaskStatus(id: string): string {
    const t = this.scheduler.getTask(id);
    return t ? t.status : "unknown";
  }

  /**
   * Gathers observability statistics.
   */
  public getPerformanceMetrics(): OrchestratorMetrics {
    const total = this.scheduler.totalProcessed || 1;
    return {
      averageLatencyMs: this.scheduler.totalLatencyMs / total,
      successRate: this.scheduler.successCount / total,
      failureRate: this.scheduler.failureCount / total,
      queueLength: this.scheduler.getQueueLength(),
      totalTasksProcessed: this.scheduler.totalProcessed
    };
  }

  private startWorkerLoop(): void {
    this.processIntervalId = setInterval(() => {
      this.triggerProcessing();
    }, this.config.workerTickIntervalMs);
  }

  private stopWorkerLoop(): void {
    if (this.processIntervalId) {
      clearInterval(this.processIntervalId);
    }
  }

  private restartWorkerLoop(): void {
    this.stopWorkerLoop();
    this.startWorkerLoop();
  }

  public shutdown(): void {
    this.stopWorkerLoop();
  }

  private async triggerProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      let task = this.scheduler.getNextExecutableTask();
      while (task) {
        const executableTask = task;
        
        // Execute request in routing failovers wrappers
        this.scheduler.executeTask(executableTask, async (t) => {
          // Identify capability matching routing rule
          const capability = t.name; // Use task name as capability search key
          return this.router.routeRequest(capability, t, async (mod, taskRef) => {
            return mod.execute(taskRef);
          });
        }).catch(() => {
          // Suppress task execution errors to prevent loop interruption
        });

        task = this.scheduler.getNextExecutableTask();
      }
    } finally {
      this.isProcessing = false;
    }
  }
}
export * from "./types";
export * from "./config";
