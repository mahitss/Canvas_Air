export interface TaskQueuedPayload {
  taskId: string;
  name: string;
  priority: string;
}

export interface TaskStartedPayload {
  taskId: string;
  providerName: string;
}

export interface TaskCompletedPayload {
  taskId: string;
  latencyMs: number;
}

export interface TaskFailedPayload {
  taskId: string;
  error: string;
}

export interface ProviderRegisteredPayload {
  providerName: string;
  capabilities: string[];
  version: string;
}

export interface ProviderUnavailablePayload {
  providerName: string;
  reason: string;
}

export interface PipelineCompletedPayload {
  pipelineId: string;
  durationMs: number;
}

export interface PipelineFailedPayload {
  pipelineId: string;
  error: string;
}

export type AiEventType =
  | "TaskQueued"
  | "TaskStarted"
  | "TaskCompleted"
  | "TaskFailed"
  | "ProviderRegistered"
  | "ProviderUnavailable"
  | "PipelineCompleted"
  | "PipelineFailed";

export interface AiEvent {
  type: AiEventType;
  payload: any;
  timestamp: number;
}
