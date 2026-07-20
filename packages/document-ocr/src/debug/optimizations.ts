import { OCRResult } from "../types";

export class DocIntelOptimizer {
  private static readonly ocrCache = new Map<string, OCRResult>();
  private static readonly memoryBuffer: any[] = new Array(5000);

  /**
   * OCR Result Caching: fetches cached OCR outputs based on document URIs.
   */
  public static getCachedOcr(uri: string): OCRResult | null {
    return this.ocrCache.get(uri) || null;
  }

  public static cacheOcr(uri: string, result: OCRResult): void {
    this.ocrCache.set(uri, result);
  }

  /**
   * Parallel Page Processing: processes multiple page raw inputs in parallel.
   */
  public static async processPagesParallel<T, R>(
    pages: T[],
    processor: (page: T) => Promise<R>
  ): Promise<R[]> {
    return Promise.all(pages.map((p) => processor(p)));
  }

  /**
   * Memory Reuse: populates pre-allocated static arrays to minimize GC load.
   */
  public static fillMemoryBuffer(blocks: any[]): any[] {
    const limit = Math.min(blocks.length, this.memoryBuffer.length);
    for (let i = 0; i < limit; i++) {
      this.memoryBuffer[i] = blocks[i];
    }
    return this.memoryBuffer.slice(0, limit);
  }

  public static clearCache(): void {
    this.ocrCache.clear();
  }
}
