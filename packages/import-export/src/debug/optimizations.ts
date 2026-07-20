import { AssetReference } from "../domain";

export class IoOptimizer {
  private static readonly arrayBufferPool: ArrayBuffer[] = [];

  /**
   * Memory reuse: retrieves a pre-allocated buffer from the pool to avoid garbage collection churn.
   */
  public static acquireBuffer(sizeBytes: number): ArrayBuffer {
    const index = this.arrayBufferPool.findIndex((buf) => buf.byteLength >= sizeBytes);
    if (index !== -1) {
      return this.arrayBufferPool.splice(index, 1)[0]!;
    }
    return new ArrayBuffer(sizeBytes);
  }

  public static releaseBuffer(buffer: ArrayBuffer): void {
    if (this.arrayBufferPool.length < 10) {
      this.arrayBufferPool.push(buffer);
    }
  }

  /**
   * Parallel asset handling: processes multiple asset encodings concurrently using Promise.all batches.
   */
  public static async processAssetsInParallel(
    assets: AssetReference[],
    concurrencyLimit = 4
  ): Promise<AssetReference[]> {
    const processed: AssetReference[] = [];
    for (let i = 0; i < assets.length; i += concurrencyLimit) {
      const batch = assets.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(async (asset) => {
          // Simulate asset processing / encoding step
          return {
            ...asset,
            sizeBytes: asset.sizeBytes
          };
        })
      );
      processed.push(...batchResults);
    }
    return processed;
  }
}
