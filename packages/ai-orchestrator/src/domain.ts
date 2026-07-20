import { TaskPriority } from "./types";

export type ProviderStatus = "healthy" | "unhealthy" | "degraded";

/**
 * Domain model representing a registered AI Provider / Module.
 */
export interface AiProvider {
  name: string;
  capabilities: string[];
  status: ProviderStatus;
  latencyScoreMs: number;
  successRate: number;
}

/**
 * Domain model representing a routed execution task.
 */
export interface AiOrchestratedTask {
  id: string;
  name: string;
  priority: TaskPriority;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  payload: any;
  result?: any;
  error?: string;
  dependencies: string[];
  retryCount: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

/**
 * Domain model representing aggregated capability results mapping.
 */
export interface AggregatedResult {
  taskId: string;
  aggregatedData: Record<string, any>;
  computedAt: number;
}
