import { IPerformanceMonitor } from "./interfaces";
import { PerformanceStats } from "./types";

/**
 * Production-quality Performance Monitor Service.
 * Tracks frame budgets, processing latencies, worker delays, memory telemetry, and CPU metrics.
 */
export class PerformanceMonitor implements IPerformanceMonitor {
  private processedCount = 0;
  private droppedCount = 0;
  private totalProcessingTimeMs = 0;
  private lastFPMSRun = Date.now();

  private captureLatencies: number[] = [];
  private workerLatencies: number[] = [];

  private memoryUsageBytes = 0;
  private cpuUsagePercent = 0;

  // Track historical cpu time for delta calculations
  private lastCpuUsage: { user: number; system: number } | null = null;
  private lastCpuTime = Date.now();

  constructor() {
    this.updateSystemMetrics();
  }

  public recordFrameProcessed(_latencyMs: number, processingTimeMs: number): void {
    this.processedCount++;
    this.totalProcessingTimeMs += processingTimeMs;
  }

  public recordDroppedFrame(): void {
    this.droppedCount++;
  }

  public recordCapture(latencyMs: number): void {
    this.captureLatencies.push(latencyMs);
    if (this.captureLatencies.length > 50) {
      this.captureLatencies.shift();
    }
  }

  public recordWorker(latencyMs: number): void {
    this.workerLatencies.push(latencyMs);
    if (this.workerLatencies.length > 50) {
      this.workerLatencies.shift();
    }
  }

  /**
   * Refreshes memory allocations and CPU consumption metrics.
   */
  public updateSystemMetrics(): void {
    const now = Date.now();
    const proc = typeof globalThis !== "undefined" ? (globalThis as any).process : undefined;

    // Memory usage retrieval
    if (typeof window !== "undefined" && (window.performance as any)?.memory) {
      this.memoryUsageBytes = (window.performance as any).memory.usedJSHeapSize;
    } else if (proc && typeof proc.memoryUsage === "function") {
      this.memoryUsageBytes = proc.memoryUsage().heapUsed;
    } else {
      this.memoryUsageBytes = 0;
    }

    // CPU usage estimation delta
    if (proc && typeof proc.cpuUsage === "function") {
      const currentCpu = proc.cpuUsage();
      if (this.lastCpuUsage) {
        const userDiff = currentCpu.user - this.lastCpuUsage.user;
        const sysDiff = currentCpu.system - this.lastCpuUsage.system;
        const timeDiffMs = now - this.lastCpuTime;

        // Express CPU as utilization percentage (100% cap per logical core)
        if (timeDiffMs > 0) {
          const totalCpuTimeUs = userDiff + sysDiff;
          this.cpuUsagePercent = totalCpuTimeUs / (timeDiffMs * 1000) * 100;
        }
      }
      this.lastCpuUsage = currentCpu;
      this.lastCpuTime = now;
    } else {
      this.cpuUsagePercent = 0;
    }
  }

  public getStats(): PerformanceStats {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastFPMSRun) / 1000;
    const actualFps = elapsedSeconds > 0 ? this.processedCount / elapsedSeconds : 0;

    const avgCapture =
      this.captureLatencies.length > 0
        ? this.captureLatencies.reduce((a, b) => a + b, 0) / this.captureLatencies.length
        : 0;

    const avgWorker =
      this.workerLatencies.length > 0
        ? this.workerLatencies.reduce((a, b) => a + b, 0) / this.workerLatencies.length
        : 0;

    const averageProcessingTime =
      this.processedCount > 0 ? this.totalProcessingTimeMs / this.processedCount : 0;

    return {
      frameRateActual: actualFps,
      latencyMs: avgCapture + avgWorker,
      droppedFramesCount: this.droppedCount,
      processingTimeMs: averageProcessingTime,

      fps: actualFps,
      droppedFrames: this.droppedCount,
      captureLatencyMs: avgCapture,
      workerLatencyMs: avgWorker,
      memoryUsageBytes: this.memoryUsageBytes,
      cpuUsagePercent: this.cpuUsagePercent,
      averageProcessingTimeMs: averageProcessingTime
    };
  }

  public reset(): void {
    this.processedCount = 0;
    this.droppedCount = 0;
    this.totalProcessingTimeMs = 0;
    this.captureLatencies = [];
    this.workerLatencies = [];
    this.lastFPMSRun = Date.now();
  }
}
