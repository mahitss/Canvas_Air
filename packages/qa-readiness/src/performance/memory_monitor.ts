export interface MemoryFootprint {
  allocatedTextures: number;
  reusedBuffersCount: number;
  unboundedCacheSize: number;
  hasLeaks: boolean;
}

export class MemoryMonitor {
  private texturesCount = 0;
  private buffersReused = 0;
  private cacheLimit = 1000;
  private activeCacheSize = 0;

  public allocateTexture(): void {
    this.texturesCount++;
  }

  public reuseBuffer(): void {
    this.buffersReused++;
  }

  public writeToCache(itemsCount: number): void {
    this.activeCacheSize = Math.min(this.cacheLimit, this.activeCacheSize + itemsCount);
  }

  /**
   * Evaluates active texture allocations and leaks indicators.
   */
  public evaluateMemoryHealth(): MemoryFootprint {
    const hasLeaks = this.texturesCount > 100;
    return {
      allocatedTextures: this.texturesCount,
      reusedBuffersCount: this.buffersReused,
      unboundedCacheSize: this.activeCacheSize,
      hasLeaks
    };
  }

  public setCacheLimit(limit: number): void {
    this.cacheLimit = limit;
  }

  public getCacheLimit(): number {
    return this.cacheLimit;
  }

  public clear(): void {
    this.texturesCount = 0;
    this.buffersReused = 0;
    this.activeCacheSize = 0;
  }
}
