export interface CollaborationTelemetryStats {
  latencyMs: number;
  syncDelayMs: number;
  connectedUsers: number;
  packetLossRate: number;
  conflictRate: number;
  reconnectsCount: number;
}

export class CollaborationMonitoringService {
  private latencyMs = 0;
  private syncDelayMs = 0;
  private connectedUsers = 0;
  private packetLossRate = 0.0;
  private conflictRate = 0.0;
  private reconnectsCount = 0;

  private totalOpsProcessed = 0;
  private totalConflictsResolved = 0;

  public recordLatency(ms: number): void {
    // Keep moving average
    this.latencyMs = this.latencyMs === 0 ? ms : Math.round(this.latencyMs * 0.9 + ms * 0.1);
  }

  public recordSyncDelay(ms: number): void {
    this.syncDelayMs = this.syncDelayMs === 0 ? ms : Math.round(this.syncDelayMs * 0.9 + ms * 0.1);
  }

  public setConnectedUsers(count: number): void {
    this.connectedUsers = count;
  }

  public recordPacketLoss(lost: boolean): void {
    const factor = lost ? 1 : 0;
    this.packetLossRate = this.packetLossRate * 0.95 + factor * 0.05;
  }

  public recordOperationApplied(hasConflict: boolean): void {
    this.totalOpsProcessed++;
    if (hasConflict) {
      this.totalConflictsResolved++;
    }
    this.conflictRate = this.totalOpsProcessed === 0 ? 0 : this.totalConflictsResolved / this.totalOpsProcessed;
  }

  public incrementReconnects(): void {
    this.reconnectsCount++;
  }

  /**
   * Returns a frozen snapshot projection of the collected collaboration metrics to prevent mutation.
   */
  public getStats(): Readonly<CollaborationTelemetryStats> {
    return Object.freeze({
      latencyMs: this.latencyMs,
      syncDelayMs: this.syncDelayMs,
      connectedUsers: this.connectedUsers,
      packetLossRate: Number(this.packetLossRate.toFixed(4)),
      conflictRate: Number(this.conflictRate.toFixed(4)),
      reconnectsCount: this.reconnectsCount
    });
  }
}
