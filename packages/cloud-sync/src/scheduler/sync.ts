import { LocalStorageEngine } from "../storage/local";
import { ReplicationEngine } from "../replication/engine";
import { DEFAULT_SYNC_CONFIG } from "../config";

export class SyncScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private intervalMs: number;

  constructor(intervalMs: number = DEFAULT_SYNC_CONFIG.syncIntervalMs) {
    this.intervalMs = intervalMs;
  }

  /**
   * Spawns background periodic loops pushing accumulated local modifications.
   */
  public startSyncLoop(localDb: LocalStorageEngine, replication: ReplicationEngine): void {
    if (this.timer) return;

    this.timer = setInterval(async () => {
      try {
        await replication.sync(localDb);
      } catch (err) {
        // Safe background catch to maintain thread reliability
        console.error("Background replication cycle failed:", err);
      }
    }, this.intervalMs);
  }

  public stopSyncLoop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public isRunning(): boolean {
    return this.timer !== null;
  }
}
