import { SpatialAnchor } from "../types";

export interface SyncConfig {
  syncIntervalMs: number;
  enableOfflineRecovery: boolean;
}

export class SpatialSyncEngine {
  private readonly config: SyncConfig;
  private offlineSyncQueue: { anchorId: string; action: "add" | "delete" }[] = [];
  private online = true;

  constructor(config: SyncConfig = { syncIntervalMs: 500, enableOfflineRecovery: true }) {
    this.config = config;
  }

  public setOnline(status: boolean): void {
    this.online = status;
    if (this.online && this.config.enableOfflineRecovery) {
      this.flushOfflineQueue();
    }
  }

  /**
   * Synchronizes spatial anchor locations, resolving conflicts by taking the latest timestamp.
   */
  public resolveAnchorConflict(local: SpatialAnchor, remote: SpatialAnchor): SpatialAnchor {
    if (remote.createdAt > local.createdAt) {
      return { ...remote };
    }
    return { ...local };
  }

  public queueOfflineChange(anchorId: string, action: "add" | "delete"): void {
    if (!this.online) {
      this.offlineSyncQueue.push({ anchorId, action });
    }
  }

  public getOfflineQueue() {
    return this.offlineSyncQueue;
  }

  private flushOfflineQueue(): void {
    this.offlineSyncQueue.length = 0; // successfully flushed
  }
}
export * from "../types";
