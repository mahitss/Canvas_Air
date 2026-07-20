import { Vector3 } from "../types";

export class SpatialOptimizer {
  private static readonly coordinateCache = new Map<string, Vector3>();
  private static readonly memoryBuffer = new Float32Array(10000);

  /**
   * Caches coordinate transform metrics using cache key matrices.
   */
  public static getCachedTransform(key: string): Vector3 | null {
    return this.coordinateCache.get(key) || null;
  }

  public static cacheTransform(key: string, result: Vector3): void {
    if (this.coordinateCache.size > 2000) {
      this.coordinateCache.clear(); // Prune memory
    }
    this.coordinateCache.set(key, { ...result });
  }

  public static fillMemoryBuffer(values: number[]): void {
    const limit = Math.min(values.length, this.memoryBuffer.length);
    for (let i = 0; i < limit; i++) {
      this.memoryBuffer[i] = values[i]!;
    }
  }

  public static getBufferSlice(length: number): Float32Array {
    return this.memoryBuffer.subarray(0, length);
  }

  public static clearCache(): void {
    this.coordinateCache.clear();
  }
}
