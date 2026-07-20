import { AiTask } from "../types";

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
}

export class CircuitBreaker {
  public state: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private lastStateChange = Date.now();

  constructor(
    private readonly failureThreshold = 3,
    private readonly cooldownPeriodMs = 1000
  ) {}

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  public recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.lastStateChange = Date.now();
    }
  }

  public canExecute(): boolean {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastStateChange;
      if (elapsed > this.cooldownPeriodMs) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false; // fast fail
    }
    return true;
  }
}

export class RetryManager {
  private readonly breakers = new Map<string, CircuitBreaker>(); // providerName -> CircuitBreaker
  private readonly deadLetterQueue: AiTask[] = [];

  constructor(
    private readonly defaultPolicy: RetryPolicy = {
      maxRetries: 3,
      baseDelayMs: 10,
      backoffFactor: 2,
      maxDelayMs: 1000
    }
  ) {}

  public getCircuitBreaker(providerName: string): CircuitBreaker {
    let cb = this.breakers.get(providerName);
    if (!cb) {
      cb = new CircuitBreaker();
      this.breakers.set(providerName, cb);
    }
    return cb;
  }

  /**
   * Classifies error type to distinguish recoverable transient from fatal errors.
   */
  public classifyError(error: Error): "TRANSIENT" | "FATAL" {
    const msg = error.message.toLowerCase();
    // Transient timeouts, rate limits, or network glitches are retried
    if (
      msg.includes("timeout") ||
      msg.includes("rate limit") ||
      msg.includes("network") ||
      msg.includes("busy")
    ) {
      return "TRANSIENT";
    }
    return "FATAL";
  }

  /**
   * Calculates exponential backoff delay with optional jitter bounds.
   */
  public getBackoffDelay(retryCount: number, policy: RetryPolicy = this.defaultPolicy): number {
    const delay = policy.baseDelayMs * Math.pow(policy.backoffFactor, retryCount);
    return Math.min(delay, policy.maxDelayMs);
  }

  /**
   * Submits a failed task to the dead-letter queue (DLQ) for manual inspection/replays.
   */
  public sendToDlq(task: AiTask, reason: string): void {
    task.status = "failed";
    task.error = `DLQ: ${reason}`;
    this.deadLetterQueue.push(task);
  }

  public getDlqTasks(): AiTask[] {
    return [...this.deadLetterQueue];
  }

  public clearDlq(): void {
    this.deadLetterQueue.length = 0;
  }
}
