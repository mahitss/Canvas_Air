import { GenerationResult } from "../types";

export class ImageOptimizer {
  private static readonly resultCache = new Map<string, GenerationResult>();
  private static readonly reusedBufferArray: string[] = new Array(5000);

  /**
   * Caches image results based on positive and negative prompt signatures.
   */
  public static getCachedResult(positive: string, negative: string): GenerationResult | null {
    const key = `${positive}##${negative}`;
    return this.resultCache.get(key) || null;
  }

  public static cacheResult(positive: string, negative: string, result: GenerationResult): void {
    const key = `${positive}##${negative}`;
    this.resultCache.set(key, result);
  }

  /**
   * Request Batching: combines multiple image generation requests to run in batches.
   */
  public static async executeBatchedRequests(
    requests: { prompt: string; options: any }[],
    batchSize = 2,
    executor: (prompt: string, options: any) => Promise<any>
  ): Promise<any[]> {
    const results: any[] = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((req) => executor(req.prompt, req.options))
      );
      results.push(...batchResults);
    }
    return results;
  }

  /**
   * Memory reuse: populates pre-allocated array positions to minimize garbage collection cycles.
   */
  public static populateBuffer(items: string[]): string[] {
    const limit = Math.min(items.length, this.reusedBufferArray.length);
    for (let i = 0; i < limit; i++) {
      this.reusedBufferArray[i] = items[i]!;
    }
    return this.reusedBufferArray.slice(0, limit);
  }

  public static clearCache(): void {
    this.resultCache.clear();
  }
}
