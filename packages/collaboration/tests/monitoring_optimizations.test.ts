import { describe, it, expect, vi } from "vitest";
import { CollaborationMonitoringService } from "../src/debug/monitoring";
import { CollaborationOptimizer } from "../src/debug/optimizations";
import { DocumentOperation } from "../src/types";

describe("Collaboration Telemetry Monitoring & Performance Optimizer", () => {
  it("should record stats, update averages, and emit frozen projections", () => {
    const monitor = new CollaborationMonitoringService();

    monitor.recordLatency(100);
    monitor.recordLatency(120);
    monitor.recordSyncDelay(50);
    monitor.setConnectedUsers(15);
    monitor.recordPacketLoss(true);
    monitor.recordPacketLoss(false);
    monitor.incrementReconnects();

    // Conflict rate tracking
    monitor.recordOperationApplied(true);
    monitor.recordOperationApplied(false);

    const stats = monitor.getStats();
    expect(stats.connectedUsers).toBe(15);
    expect(stats.reconnectsCount).toBe(1);
    expect(stats.conflictRate).toBe(0.5); // 1 out of 2 ops resolved conflict

    // Verify stats object is frozen
    expect(Object.isFrozen(stats)).toBe(true);
    expect(() => {
      (stats as any).connectedUsers = 100;
    }).toThrow();
  });

  it("should batch operations, compress payloads, and adapt windows dynamically", () => {
    vi.useFakeTimers();
    const sentBatches: string[] = [];
    const optimizer = new CollaborationOptimizer(async (compressedBatch) => {
      sentBatches.push(compressedBatch);
      return true;
    });

    const op: DocumentOperation = {
      elementId: "test-id", action: "insert", value: {}, timestamp: Date.now(), vectorClock: 1, userId: "A"
    };

    // Low latency batching
    optimizer.queueOperation(op);
    expect(optimizer.getBatchQueue().length).toBe(1);

    vi.advanceTimersByTime(25);
    expect(optimizer.getBatchQueue().length).toBe(0); // auto flushed
    expect(sentBatches.length).toBe(1);

    // Adapt window on latency spike
    optimizer.adaptSyncFrequency(400); // high latency
    optimizer.queueOperation(op);
    optimizer.queueOperation(op);

    // Advance 50ms, should not flush yet because window is now 150ms
    vi.advanceTimersByTime(50);
    expect(optimizer.getBatchQueue().length).toBe(2);

    vi.advanceTimersByTime(110); // reaches 160ms total
    expect(optimizer.getBatchQueue().length).toBe(0); // flushed
    expect(sentBatches.length).toBe(2);

    vi.useRealTimers();
  });
});
