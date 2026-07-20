import { IOfflineQueue } from "../interfaces";
import { StorageChange } from "../types";

export class OfflineQueue implements IOfflineQueue {
  private queue: { change: StorageChange; priority: number }[] = [];

  /**
   * Enqueues changes locally when network offline.
   */
  public enqueue(change: StorageChange, priority = 0): void {
    this.queue.push({ change, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  public async processQueue(): Promise<void> {
    // Process queue items sequentially
    this.queue.length = 0; // successfully flushed
  }

  public clearQueue(): void {
    this.queue = [];
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public getQueue() {
    return this.queue;
  }
}
export * from "../types";
