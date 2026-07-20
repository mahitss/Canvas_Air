import { AiTask, TaskPriority } from "../types";
import { IAiTaskScheduler } from "../interfaces";

export class TaskScheduler implements IAiTaskScheduler {
  private readonly queue: AiTask[] = [];
  private activeCount: number = 0;
  private concurrencyLimit: number = 4;
  
  // Observability rolling counts
  public totalLatencyMs: number = 0;
  public successCount: number = 0;
  public failureCount: number = 0;
  public totalProcessed: number = 0;

  constructor(concurrencyLimit: number = 4) {
    this.concurrencyLimit = concurrencyLimit;
  }

  public setConcurrencyLimit(limit: number): void {
    this.concurrencyLimit = limit;
  }

  /**
   * Enqueues an AI task and uses O(log N) binary insertion sort to maintain sorted sequence,
   * completely avoiding O(N log N) full sort allocations.
   */
  public enqueue(task: AiTask): void {
    const priorityWeights: Record<TaskPriority, number> = {
      high: 3,
      medium: 2,
      low: 1
    };

    const targetWeight = priorityWeights[task.priority] || 1;

    let low = 0;
    let high = this.queue.length;

    while (low < high) {
      const mid = (low + high) >> 1;
      const midTask = this.queue[mid]!;
      const midWeight = priorityWeights[midTask.priority] || 1;

      if (midWeight < targetWeight) {
        high = mid; // insert before mid
      } else if (midWeight > targetWeight) {
        low = mid + 1; // insert after mid
      } else {
        // Equal priority: FIFO based on createdAt
        if (task.createdAt < midTask.createdAt) {
          high = mid;
        } else {
          low = mid + 1;
        }
      }
    }

    this.queue.splice(low, 0, task);
  }

  /**
   * Cancels a queued or pending task.
   */
  public cancel(id: string): void {
    const task = this.queue.find(t => t.id === id);
    if (task && (task.status === "pending" || task.status === "running")) {
      task.status = "cancelled";
    }
  }

  /**
   * Return length of queue without array allocations.
   */
  public getQueueLength(): number {
    let count = 0;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i]!.status === "pending") {
        count++;
      }
    }
    return count;
  }

  public getTask(id: string): AiTask | undefined {
    // Avoid find lookup where possible by checking directly
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i]!.id === id) return this.queue[i];
    }
    return undefined;
  }

  /**
   * Selects next execution node matching priority, concurrency bounds, and dependency criteria.
   */
  public getNextExecutableTask(): AiTask | undefined {
    if (this.activeCount >= this.concurrencyLimit) {
      return undefined;
    }

    for (let i = 0; i < this.queue.length; i++) {
      const task = this.queue[i]!;
      if (task.status !== "pending") continue;

      let depsSatisfied = true;
      if (task.dependencies && task.dependencies.length > 0) {
        for (let j = 0; j < task.dependencies.length; j++) {
          const depId = task.dependencies[j]!;
          const depTask = this.getTask(depId);
          if (!depTask || depTask.status !== "completed") {
            depsSatisfied = false;
            break;
          }
        }
      }

      if (depsSatisfied) {
        return task;
      }
    }
    return undefined;
  }

  /**
   * Ticks task states, checking timeouts and resolving retries on failures.
   */
  public async executeTask(
    task: AiTask,
    runner: (task: AiTask) => Promise<any>
  ): Promise<any> {
    task.status = "running";
    this.activeCount++;

    let timeoutId: any = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Task execution timed out after ${task.timeoutMs}ms.`));
      }, task.timeoutMs);
    });

    try {
      const result = await Promise.race([runner(task), timeoutPromise]);
      clearTimeout(timeoutId);

      task.status = "completed";
      task.result = result;
      task.completedAt = Date.now();
      
      this.successCount++;
      this.totalProcessed++;
      this.totalLatencyMs += task.completedAt - task.createdAt;

      this.activeCount--;
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      this.activeCount--;

      if (task.retryCount < task.retryLimit) {
        task.retryCount++;
        task.status = "pending"; // Re-queue
        return this.executeTask(task, runner);
      }

      task.status = "failed";
      task.error = err.message || "Unknown error";
      task.completedAt = Date.now();
      
      this.failureCount++;
      this.totalProcessed++;
      this.totalLatencyMs += task.completedAt - task.createdAt;
      
      throw err;
    }
  }

  /**
   * Returns current statistics of the task scheduler queue without allocations.
   */
  public getStats() {
    let pending = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;
    let cancelled = 0;

    for (let i = 0; i < this.queue.length; i++) {
      const s = this.queue[i]!.status;
      if (s === "pending") pending++;
      else if (s === "running") running++;
      else if (s === "completed") completed++;
      else if (s === "failed") failed++;
      else if (s === "cancelled") cancelled++;
    }

    return {
      pending,
      running,
      completed,
      failed,
      cancelled,
      activeCount: this.activeCount,
      concurrencyLimit: this.concurrencyLimit,
      successCount: this.successCount,
      failureCount: this.failureCount,
      totalProcessed: this.totalProcessed,
      averageLatencyMs: this.totalProcessed > 0 ? this.totalLatencyMs / this.totalProcessed : 0
    };
  }
}
export * from "../types";
export * from "../config";
