import { DocumentOperation } from "../types";
import { SyncCompressor } from "../sync/sync_engine";

export class CollaborationOptimizer {
  private batchQueue: DocumentOperation[] = [];
  private batchTimeout?: any;
  private batchWindowMs = 20; // default low latency sync

  constructor(
    private readonly sendCallback: (compressedBatch: string) => Promise<boolean>
  ) {}

  public getBatchQueue(): DocumentOperation[] {
    return this.batchQueue;
  }

  /**
   * Adapts the batching window duration dynamically based on current connection latency.
   * If latency is high, widens the window to batch more and save packet frequency.
   */
  public adaptSyncFrequency(latencyMs: number): void {
    if (latencyMs > 300) {
      this.batchWindowMs = 150; // high latency: batch updates widely
    } else if (latencyMs > 100) {
      this.batchWindowMs = 75; // medium latency
    } else {
      this.batchWindowMs = 20; // low latency: send updates fast
    }
  }

  /**
   * Enqueues an operation into the batch buffer.
   */
  public queueOperation(op: DocumentOperation): void {
    this.batchQueue.push(op);
    
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushBatch();
      }, this.batchWindowMs);
    }
  }

  /**
   * Instantly flushes accumulated operations, compressing them into a single transmission packet.
   */
  public flushBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }

    if (this.batchQueue.length === 0) return;

    const payload = SyncCompressor.compress(this.batchQueue);
    this.sendCallback(payload);
    this.batchQueue = []; // clear
  }
}
