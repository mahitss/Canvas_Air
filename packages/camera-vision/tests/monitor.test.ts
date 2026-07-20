import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PerformanceMonitor } from "../src/monitor";

describe("Performance Monitor Service", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    monitor.reset();
  });

  it("should record processed frames and calculate average processing time", () => {
    monitor.recordFrameProcessed(10, 15);
    monitor.recordFrameProcessed(12, 25);

    const stats = monitor.getStats();
    expect(stats.droppedFrames).toBe(0);
    expect(stats.averageProcessingTimeMs).toBe(20); // (15 + 25) / 2
  });

  it("should track and report dropped frames count", () => {
    monitor.recordDroppedFrame();
    monitor.recordDroppedFrame();

    const stats = monitor.getStats();
    expect(stats.droppedFrames).toBe(2);
    expect(stats.droppedFramesCount).toBe(2);
  });

  it("should compute running averages of capture and worker latencies", () => {
    monitor.recordCapture(5);
    monitor.recordCapture(15);

    monitor.recordWorker(20);
    monitor.recordWorker(40);

    const stats = monitor.getStats();
    expect(stats.captureLatencyMs).toBe(10); // (5 + 15) / 2
    expect(stats.workerLatencyMs).toBe(30); // (20 + 40) / 2
    expect(stats.latencyMs).toBe(40); // capture + worker
  });

  it("should extract memory and CPU usage details on update cycles", () => {
    monitor.updateSystemMetrics();
    const stats = monitor.getStats();

    expect(stats.memoryUsageBytes).toBeGreaterThan(0);
    expect(stats.cpuUsagePercent).toBeDefined();
  });
});
