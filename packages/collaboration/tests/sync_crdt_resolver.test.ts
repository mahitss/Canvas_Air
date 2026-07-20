import { describe, it, expect } from "vitest";
import { ConflictResolver } from "../src/crdt/resolver";
import { CollaborationSyncEngine, SyncCompressor } from "../src/sync/sync_engine";
import { DocumentOperation } from "../src/types";

describe("CRDT & Synchronization Engine Integration", () => {
  it("should handle CRDT layer updates, deletions, and locks correctly", () => {
    const resolver = new ConflictResolver();

    // 1. Layer/zIndex tracking
    const op1: DocumentOperation = {
      elementId: "rect1", action: "insert", value: { width: 100, zIndex: 2 }, timestamp: 1000, vectorClock: 1, userId: "A"
    };
    resolver.applyOperation(op1);
    expect(resolver.getState().elements["rect1"].zIndex).toBe(2);

    // Layer zIndex conflict resolve
    const op2: DocumentOperation = {
      elementId: "rect1", action: "update", value: { width: 150, zIndex: 5 }, timestamp: 2000, vectorClock: 2, userId: "B"
    };
    resolver.applyOperation(op2);
    expect(resolver.getState().elements["rect1"].zIndex).toBe(5);

    // 2. Deletion overrides updates (Deletion Conflict)
    const delOp: DocumentOperation = {
      elementId: "rect1", action: "delete", value: {}, timestamp: 3000, vectorClock: 3, userId: "A"
    };
    resolver.applyOperation(delOp);
    expect(resolver.getState().elements["rect1"]).toBeUndefined();
    expect(resolver.getState().tombstoneSet).toContain("rect1");

    // Attempted update on deleted element should be rejected
    const staleUpdate: DocumentOperation = {
      elementId: "rect1", action: "update", value: { width: 200 }, timestamp: 4000, vectorClock: 4, userId: "B"
    };
    const applied = resolver.applyOperation(staleUpdate);
    expect(applied).toBe(false);

    // 3. Selection locks
    resolver.applyOperation({
      elementId: "circle1", action: "insert", value: { r: 50 }, timestamp: 5000, vectorClock: 5, userId: "A"
    });

    const locked = resolver.acquireLock("circle1", "user-1", 10000);
    expect(locked).toBe(true);

    const lockHacked = resolver.acquireLock("circle1", "user-2", 10000);
    expect(lockHacked).toBe(false); // Locked by user-1

    const opHacked: DocumentOperation = {
      elementId: "circle1", action: "update", value: { r: 75 }, timestamp: 6000, vectorClock: 6, userId: "user-2"
    };
    const hackApplied = resolver.applyOperation(opHacked);
    expect(hackApplied).toBe(false); // Rejected due to lock
  });

  it("should process reliable resends, out-of-order buffers, and offline queues", async () => {
    const resolver = new ConflictResolver();
    const sentPayloads: string[] = [];
    const mockNetwork = {
      send: async (payload: string) => {
        sentPayloads.push(payload);
        return true;
      }
    };

    const sync = new CollaborationSyncEngine(resolver, mockNetwork);

    // 1. Offline editing
    const opOffline: DocumentOperation = {
      elementId: "line1", action: "insert", value: { len: 10 }, timestamp: 1000, vectorClock: 1, userId: "A"
    };
    await sync.submitOperation(opOffline, false); // offline
    expect(sync.getOfflineQueue().length).toBe(1);

    // Recover online connection
    await sync.synchronizeOfflineQueue();
    expect(sync.getOfflineQueue().length).toBe(0);
    expect(resolver.getState().elements["line1"]).toBeDefined();

    // 2. Out-of-order handling
    // Advance expected remote sequence to 2 by receiving vectorClock 1 remotely
    sync.receiveOperations(SyncCompressor.compress([opOffline]));

    const opOoo: DocumentOperation = {
      elementId: "line1", action: "update", value: { len: 30 }, timestamp: 3000, vectorClock: 3, userId: "B" // gap: expected 2
    };
    sync.receiveOperations(SyncCompressor.compress([opOoo]));
    expect(sync.getOooBuffer().length).toBe(1);

    // Now missing clock 2 arrives
    const opNext: DocumentOperation = {
      elementId: "line1", action: "update", value: { len: 20 }, timestamp: 2000, vectorClock: 2, userId: "B"
    };
    sync.receiveOperations(SyncCompressor.compress([opNext]));
    expect(sync.getOooBuffer().length).toBe(0); // flushed
    expect(resolver.getState().elements["line1"].value.len).toBe(30); // final result
  });

  it("should benchmark CRDT throughput and run compression comparisons", () => {
    const resolver = new ConflictResolver();
    const ops: DocumentOperation[] = [];

    for (let i = 0; i < 5000; i++) {
      ops.push({
        elementId: `elem-${i}`,
        action: "insert",
        value: { index: i, coordinates: [i, i * 2] },
        timestamp: Date.now() + i,
        vectorClock: i,
        userId: "A"
      });
    }

    const start = Date.now();
    for (const op of ops) {
      resolver.applyOperation(op);
    }
    const duration = Date.now() - start;
    console.log(`[CRDT Benchmark] Applied 5,000 concurrent updates in ${duration}ms`);
    expect(duration).toBeLessThan(100); // Should resolve in under 100ms

    // Compression comparison
    const rawSize = JSON.stringify(ops).length;
    const compressed = SyncCompressor.compress(ops);
    const compressedSize = compressed.length;
    console.log(`[Sync Compression] Raw JSON size: ${rawSize} bytes, Compressed size: ${compressedSize} bytes (Ratio: ${((compressedSize / rawSize) * 100).toFixed(1)}%)`);
    expect(compressedSize).toBeLessThan(rawSize);

    const decompressed = SyncCompressor.decompress(compressed);
    expect(decompressed.length).toBe(5000);
    expect(decompressed[0]?.elementId).toBe("elem-0");
  });
});
