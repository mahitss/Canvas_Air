import { IMonitoringService } from "../interfaces";

export class MonitoringService implements IMonitoringService {
  private totalLatencyMs = 0;
  private syncRunsCount = 0;
  private failuresCount = 0;
  private uploadedBytesCount = 0;
  private downloadedBytesCount = 0;

  public trackSyncLatency(ms: number): void {
    this.totalLatencyMs += ms;
    this.syncRunsCount++;
  }

  public trackSyncFailure(): void {
    this.failuresCount++;
  }

  public trackBandwidth(uploadedBytes: number, downloadedBytes: number): void {
    this.uploadedBytesCount += uploadedBytes;
    this.downloadedBytesCount += downloadedBytes;
  }

  public getSyncStats() {
    return {
      averageLatencyMs: this.syncRunsCount === 0 ? 0 : this.totalLatencyMs / this.syncRunsCount,
      failuresCount: this.failuresCount,
      uploadedBytes: this.uploadedBytesCount,
      downloadedBytes: this.downloadedBytesCount
    };
  }
}
