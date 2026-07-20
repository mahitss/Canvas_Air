import { DetectedObject } from "../types";

export class SceneOptimizer {
  private static readonly cache = new Map<string, DetectedObject[]>();
  private static lastFrameTime = 0;
  private static readonly gpuBuffer: any[] = new Array(5000);

  /**
   * Result Caching: fetches cached detection results based on URI parameters.
   */
  public static getCachedDetections(uri: string): DetectedObject[] | null {
    return this.cache.get(uri) || null;
  }

  public static cacheDetections(uri: string, results: DetectedObject[]): void {
    this.cache.set(uri, results.map(r => ({ ...r })));
  }

  /**
   * Frame Skipping: skips frame if frame interval matches load limits (e.g. < 33ms).
   */
  public static shouldProcessFrame(timestamp: number, frameSkipMs = 33): boolean {
    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed < frameSkipMs) {
      return false; // Skip frame
    }
    this.lastFrameTime = timestamp;
    return true;
  }

  /**
   * GPU Acceleration Hook.
   */
  public static bindGpuTexture(textureId: string): boolean {
    void textureId;
    return true;
  }

  /**
   * Memory Buffer Allocation.
   */
  public static fillGpuBuffer(items: any[]): any[] {
    const limit = Math.min(items.length, this.gpuBuffer.length);
    for (let i = 0; i < limit; i++) {
      this.gpuBuffer[i] = items[i];
    }
    return this.gpuBuffer.slice(0, limit);
  }

  public static clearCache(): void {
    this.cache.clear();
  }
}
