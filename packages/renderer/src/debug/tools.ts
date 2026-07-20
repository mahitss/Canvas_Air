import { RenderingStatistics } from "../types";

export class DebugTools {
  private stats: RenderingStatistics;
  
  // Timing trackers
  private cpuStartTime: number = 0;
  private fpsLastUpdateTime: number = 0;
  private frameCountSinceLastUpdate: number = 0;

  constructor() {
    this.stats = {
      fps: 60,
      drawCalls: 0,
      gpuMemoryUsedBytes: 0,
      nodesRenderedCount: 0,
      nodesCulledCount: 0,
      cpuTimeMs: 0,
      gpuTimeMs: 0
    };
    
    this.fpsLastUpdateTime = performance.now();
  }

  public beginFrame(): void {
    this.cpuStartTime = performance.now();
  }

  public endFrame(drawCalls: number, nodesRendered: number, nodesCulled: number, gpuMemory: number): void {
    const now = performance.now();
    
    // CPU timing delta
    this.stats.cpuTimeMs = now - this.cpuStartTime;
    this.stats.gpuTimeMs = this.stats.cpuTimeMs * 0.4; // WebGL GPU time mock approximation
    
    // Draw stats
    this.stats.drawCalls = drawCalls;
    this.stats.nodesRenderedCount = nodesRendered;
    this.stats.nodesCulledCount = nodesCulled;
    this.stats.gpuMemoryUsedBytes = gpuMemory;

    // FPS calculation
    this.frameCountSinceLastUpdate++;
    const elapsedFpsTime = now - this.fpsLastUpdateTime;
    if (elapsedFpsTime >= 1000) {
      this.stats.fps = (this.frameCountSinceLastUpdate * 1000) / elapsedFpsTime;
      this.frameCountSinceLastUpdate = 0;
      this.fpsLastUpdateTime = now;
    }
  }

  public getStats(): RenderingStatistics {
    return { ...this.stats };
  }
}
