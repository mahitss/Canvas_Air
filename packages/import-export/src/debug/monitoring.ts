export interface IoStatsSummary {
  importDurationAvgMs: number;
  exportDurationAvgMs: number;
  fileSizeAvgBytes: number;
  compressionRatioAvg: number;
  failuresCount: number;
  adapterUsages: Record<string, number>;
}

export class IoTelemetryMonitor {
  private importTotalMs = 0;
  private importCount = 0;

  private exportTotalMs = 0;
  private exportCount = 0;

  private totalSize = 0;
  private sizeCount = 0;

  private totalCompressionRatio = 0.0;
  private ratioCount = 0;

  private failuresCount = 0;
  private readonly adapterUsages: Record<string, number> = {};

  public recordImport(ms: number, sizeBytes: number): void {
    this.importTotalMs += ms;
    this.importCount++;

    this.totalSize += sizeBytes;
    this.sizeCount++;
  }

  public recordExport(ms: number, sizeBytes: number, compressedSize?: number): void {
    this.exportTotalMs += ms;
    this.exportCount++;

    this.totalSize += sizeBytes;
    this.sizeCount++;

    if (compressedSize !== undefined && sizeBytes > 0) {
      const ratio = compressedSize / sizeBytes;
      this.totalCompressionRatio += ratio;
      this.ratioCount++;
    }
  }

  public recordFailure(): void {
    this.failuresCount++;
  }

  public recordAdapterUsage(adapterName: string): void {
    this.adapterUsages[adapterName] = (this.adapterUsages[adapterName] || 0) + 1;
  }

  /**
   * Returns a frozen snapshot projection of the collected I/O metrics.
   */
  public getStats(): Readonly<IoStatsSummary> {
    return Object.freeze({
      importDurationAvgMs: this.importCount === 0 ? 0 : Math.round(this.importTotalMs / this.importCount),
      exportDurationAvgMs: this.exportCount === 0 ? 0 : Math.round(this.exportTotalMs / this.exportCount),
      fileSizeAvgBytes: this.sizeCount === 0 ? 0 : Math.round(this.totalSize / this.sizeCount),
      compressionRatioAvg: this.ratioCount === 0 ? 1.0 : Number((this.totalCompressionRatio / this.ratioCount).toFixed(4)),
      failuresCount: this.failuresCount,
      adapterUsages: { ...this.adapterUsages }
    });
  }
}
