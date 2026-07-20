import { GPUResourceManager } from "../gpu/manager";

export interface IRenderMetrics {
  fps: number;
  frameTimeMs: number;
  gpuMemoryBytes: number;
  cpuTimeMs: number;
  drawCallsCount: number;
  trianglesCount: number;
  textureUsageCount: number;
  renderQueueLength: number;
}

/**
 * RenderMonitoringService tracks rendering telemetry such as frame processing
 * budgets, GPU texture usage, CPU durations, draw call frequencies, and primitive counts.
 */
export class RenderMonitoringService {
  private lastFpsUpdate = performance.now();
  private frameCount = 0;
  private currentFps = 60;
  
  private frameStartTime = 0;
  private cpuStartTime = 0;
  
  private metrics: IRenderMetrics = {
    fps: 60,
    frameTimeMs: 0,
    gpuMemoryBytes: 0,
    cpuTimeMs: 0,
    drawCallsCount: 0,
    trianglesCount: 0,
    textureUsageCount: 0,
    renderQueueLength: 0
  };

  constructor(private readonly gpuManager?: GPUResourceManager) {}

  /**
   * Records start timestamp parameters for frame and CPU processing times.
   */
  public beginFrame(): void {
    const now = performance.now();
    this.frameStartTime = now;
    this.cpuStartTime = now;
  }

  /**
   * Records end stats parameters, updates FPS indices, and queries GPU cache metrics.
   */
  public endFrame(drawCalls: number, triangles: number, queueLength: number): void {
    const now = performance.now();
    
    // CPU rendering duration delta
    this.metrics.cpuTimeMs = now - this.cpuStartTime;
    // Total Frame time delta (including offscreen buffer swaps)
    this.metrics.frameTimeMs = now - this.frameStartTime;
    
    this.metrics.drawCallsCount = drawCalls;
    this.metrics.trianglesCount = triangles;
    this.metrics.renderQueueLength = queueLength;

    // Retrieve active allocation statistics from the GPU resource manager
    if (this.gpuManager) {
      const gpuStats = this.gpuManager.getStats();
      this.metrics.gpuMemoryBytes = gpuStats.gpuMemoryUsedBytes;
      this.metrics.textureUsageCount = gpuStats.allocatedTexturesCount;
    }

    // Sliding window FPS calculations
    this.frameCount++;
    const elapsed = now - this.lastFpsUpdate;
    if (elapsed >= 1000) {
      this.currentFps = (this.frameCount * 1000) / elapsed;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    this.metrics.fps = this.currentFps;
  }

  /**
   * Returns a copy of the current rendering metrics statistics.
   */
  public getMetrics(): IRenderMetrics {
    return { ...this.metrics };
  }
}
