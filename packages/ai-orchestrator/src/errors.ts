/**
 * Base error class for all AI Orchestrator package errors.
 */
export class AiOrchestratorError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = "AiOrchestratorError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when routing a task capability to a registered provider fails.
 */
export class ProviderRoutingError extends AiOrchestratorError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = "ProviderRoutingError";
  }
}

/**
 * Thrown when scheduling a task or checking dependencies encounters conflicts.
 */
export class TaskSchedulingError extends AiOrchestratorError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = "TaskSchedulingError";
  }
}

/**
 * Thrown when failovers/fallbacks resolution cannot be resolved.
 */
export class FallbackResolutionError extends AiOrchestratorError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = "FallbackResolutionError";
  }
}

/**
 * Thrown when provider health metrics check falls below target standards.
 */
export class ProviderHealthError extends AiOrchestratorError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = "ProviderHealthError";
  }
}
