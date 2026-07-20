import { AiTask, AiModule, TaskPriority, OrchestratorMetrics, OrchestratorConfig } from "./types";
import { AiEvent } from "./events";

/**
 * Public interface representing the primary AI Task Orchestrator.
 */
export interface IAiOrchestrator {
  setConfig(config: OrchestratorConfig): void;
  registerModule(module: AiModule): void;
  unregisterModule(name: string): void;
  registerFallback(capability: string, fallbackCapability: string): void;
  getAvailableModules(): string[];
  submitTask(
    name: string,
    capability: string,
    priority: TaskPriority,
    payload: any,
    options?: {
      timeoutMs?: number;
      retryLimit?: number;
      dependencies?: string[];
    }
  ): Promise<any>;
  cancelTask(id: string): void;
  getTaskStatus(id: string): string;
  getPerformanceMetrics(): OrchestratorMetrics;
  shutdown(): void;
}

/**
 * Public interface representing the AI module/provider registry.
 */
export interface IAiModuleRegistry {
  register(module: AiModule): void;
  unregister(name: string): void;
  getModule(name: string): AiModule | undefined;
  getAvailableModules(): string[];
  getModulesByCapability(capability: string): AiModule[];
}

/**
 * Public interface representing the AI task scheduler.
 */
export interface IAiTaskScheduler {
  enqueue(task: AiTask): void;
  cancel(id: string): void;
  getTask(id: string): AiTask | undefined;
  getNextExecutableTask(): AiTask | undefined;
  getQueueLength(): number;
  executeTask(
    task: AiTask,
    runner: (task: AiTask) => Promise<any>
  ): Promise<any>;
}

/**
 * Public interface representing the capability engine router.
 */
export interface IAiEngineRouter {
  registerFallback(capability: string, fallbackCapability: string): void;
  routeRequest(
    capability: string,
    task: AiTask,
    executor: (module: AiModule, task: AiTask) => Promise<any>
  ): Promise<any>;
}

/**
 * Public interface representing the AI Event Bus.
 */
export interface IAiOrchestratorEventBus {
  publish(event: AiEvent): void;
  subscribe(type: string, callback: (event: AiEvent) => void): () => void;
  clearHistory(): void;
}
