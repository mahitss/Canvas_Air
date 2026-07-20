export interface PerformanceReport {
  fps: number;
  frameTimeMs: number;
  gestureLatencyMs: number;
  aiInferenceMs: number;
  ramUsageMb: number;
  gpuMemoryMb: number;
  cpuUsagePercent: number;
}

export class BenchmarkSuite {
  private readonly reportsHistory: PerformanceReport[] = [];

  /**
   * Samples frame telemetry data to generate repeatable benchmark statistics.
   */
  public runBenchmarkCycle(sample: Partial<PerformanceReport>): PerformanceReport {
    const report: PerformanceReport = {
      fps: sample.fps ?? 60,
      frameTimeMs: sample.frameTimeMs ?? 16.6,
      gestureLatencyMs: sample.gestureLatencyMs ?? 5,
      aiInferenceMs: sample.aiInferenceMs ?? 12,
      ramUsageMb: sample.ramUsageMb ?? 250,
      gpuMemoryMb: sample.gpuMemoryMb ?? 128,
      cpuUsagePercent: sample.cpuUsagePercent ?? 8
    };

    this.reportsHistory.push(report);
    return report;
  }

  public getReports(): PerformanceReport[] {
    return this.reportsHistory;
  }

  public generateMarkdownReport(): string {
    const len = this.reportsHistory.length;
    if (len === 0) return "No benchmarks recorded.";

    const avgFps = this.reportsHistory.reduce((sum, r) => sum + r.fps, 0) / len;
    const avgLatency = this.reportsHistory.reduce((sum, r) => sum + r.gestureLatencyMs, 0) / len;

    return `
# Performance Benchmark Report
- Total cycles: ${len}
- Avg FPS: ${avgFps.toFixed(1)}
- Avg Gesture Latency: ${avgLatency.toFixed(2)} ms
    `.trim();
  }

  public clear(): void {
    this.reportsHistory.length = 0;
  }
}
