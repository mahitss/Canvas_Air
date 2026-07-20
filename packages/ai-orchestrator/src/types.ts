export type TaskPriority = "high" | "medium" | "low";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface AiTask {
  id: string;
  name: string;
  priority: TaskPriority;
  payload: any;
  status: TaskStatus;
  timeoutMs: number;
  retryLimit: number;
  retryCount: number;
  dependencies?: string[];
  result?: any;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface AiModule {
  name: string;
  capabilities: string[];
  execute(task: AiTask): Promise<any>;
  healthCheck(): Promise<boolean>;
  version?: string;
  priority?: number;
  status?: "healthy" | "unhealthy" | "degraded";
  metadata?: Record<string, any>;
}

export interface OrchestratorMetrics {
  averageLatencyMs: number;
  successRate: number;
  failureRate: number;
  queueLength: number;
  totalTasksProcessed: number;
}

export interface OrchestratorConfig {
  maxQueueSize: number;
  workerTickIntervalMs: number;
  enableTimeoutChecks: boolean;
  maxParallelTasks: number;
}
