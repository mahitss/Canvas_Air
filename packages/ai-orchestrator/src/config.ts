import { OrchestratorConfig } from "./types";

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  maxQueueSize: 1000,
  workerTickIntervalMs: 10,
  enableTimeoutChecks: true,
  maxParallelTasks: 4
};
