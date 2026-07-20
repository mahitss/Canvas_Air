import { DocumentOperation } from "../types";
import { ConflictResolver } from "../crdt/resolver";

export class SyncCompressor {
  public static compress(ops: DocumentOperation[]): string {
    const raw = JSON.stringify(ops);
    return raw
      .replace(/"elementId"/g, '"eid"')
      .replace(/"action"/g, '"act"')
      .replace(/"value"/g, '"val"')
      .replace(/"timestamp"/g, '"ts"')
      .replace(/"vectorClock"/g, '"vc"')
      .replace(/"userId"/g, '"uid"');
  }

  public static decompress(compressed: string): DocumentOperation[] {
    const decompressed = compressed
      .replace(/"eid"/g, '"elementId"')
      .replace(/"act"/g, '"action"')
      .replace(/"val"/g, '"value"')
      .replace(/"ts"/g, '"timestamp"')
      .replace(/"vc"/g, '"vectorClock"')
      .replace(/"uid"/g, '"userId"');
    return JSON.parse(decompressed);
  }
}

export class CollaborationSyncEngine {
  private readonly offlineQueue: DocumentOperation[] = [];
  private readonly oooBuffer: DocumentOperation[] = []; // Out-of-order buffer
  private readonly unackedOps = new Map<string, DocumentOperation>(); // messageId -> op
  private expectedSequence = 1;

  constructor(
    private readonly resolver: ConflictResolver,
    private readonly mockNetwork: { send: (compressedPayload: string) => Promise<boolean> }
  ) {}

  public getOfflineQueue(): DocumentOperation[] {
    return this.offlineQueue;
  }

  public getOooBuffer(): DocumentOperation[] {
    return this.oooBuffer;
  }

  /**
   * Enqueues local operation. If offline, pushes to queue; if online, sends immediately.
   */
  public async submitOperation(op: DocumentOperation, online: boolean): Promise<void> {
    if (!online) {
      this.offlineQueue.push(op);
      return;
    }

    // Apply locally first (CRDT LWW merge)
    this.resolver.applyOperation(op);

    // Reliable delivery setup: track unacknowledged messages
    const msgId = `${op.userId}:${op.vectorClock}`;
    this.unackedOps.set(msgId, op);

    const payload = SyncCompressor.compress([op]);
    const success = await this.mockNetwork.send(payload);
    if (success) {
      this.unackedOps.delete(msgId); // Acknowledged
    }
  }

  /**
   * Receives incoming remote operations, handling out-of-order vector sequences.
   */
  public receiveOperations(compressedPayload: string): void {
    const ops = SyncCompressor.decompress(compressedPayload);
    for (const op of ops) {
      if (op.vectorClock > this.expectedSequence) {
        // Out of order: sequence gap detected. Buffer it
        this.oooBuffer.push(op);
      } else {
        // Apply operation
        this.resolver.applyOperation(op);
        if (op.vectorClock === this.expectedSequence) {
          this.expectedSequence++;
        }
        this.flushOooBuffer();
      }
    }
  }

  /**
   * Reconciles offline queues with the remote platform server on connection recovery.
   */
  public async synchronizeOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;
    
    // Sort offline operations in temporal sequence order
    this.offlineQueue.sort((a, b) => a.timestamp - b.timestamp);

    for (const op of this.offlineQueue) {
      // Synchronously submit to network
      await this.submitOperation(op, true);
    }
    this.offlineQueue.length = 0; // Clear
  }

  /**
   * Retries transmission of unacknowledged packets.
   */
  public async retryUnacknowledged(): Promise<void> {
    for (const [msgId, op] of this.unackedOps.entries()) {
      const payload = SyncCompressor.compress([op]);
      const success = await this.mockNetwork.send(payload);
      if (success) {
        this.unackedOps.delete(msgId);
      }
    }
  }

  private flushOooBuffer(): void {
    this.oooBuffer.sort((a, b) => a.vectorClock - b.vectorClock);
    
    let progressed = true;
    while (progressed) {
      progressed = false;
      const index = this.oooBuffer.findIndex((op) => op.vectorClock === this.expectedSequence);
      if (index !== -1) {
        const nextOp = this.oooBuffer.splice(index, 1)[0]!;
        this.resolver.applyOperation(nextOp);
        this.expectedSequence++;
        progressed = true;
      }
    }
  }
}
