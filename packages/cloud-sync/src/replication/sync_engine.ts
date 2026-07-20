import { ISyncEngine } from "../interfaces";
import { SyncProgress } from "../domain";
import { ReplicationEngine } from "./engine";
import { LocalStorageEngine } from "../storage/local";
import { SyncException } from "../errors";

export class SyncEngine extends ReplicationEngine implements ISyncEngine {
  private isOnline = true;
  private isPaused = false;
  private localDb: LocalStorageEngine;
  private failedSyncsCount = 0;

  constructor(localDb: LocalStorageEngine) {
    super();
    this.localDb = localDb;
  }

  /**
   * Main sync workflow loop: retries transactions and handles delta checks.
   */
  public async triggerSync(): Promise<void> {
    if (this.isPaused || !this.isOnline) {
      return;
    }

    try {
      await this.sync(this.localDb);
      this.failedSyncsCount = 0; // reset
    } catch (err: any) {
      this.failedSyncsCount++;
      throw new SyncException(`Replication execution failed: ${err.message}`);
    }
  }

  public async resumeSync(): Promise<void> {
    this.isPaused = false;
    await this.triggerSync();
  }

  public async pauseSync(): Promise<void> {
    this.isPaused = true;
  }

  public getSyncProgress(): SyncProgress {
    return {
      sessionId: `sync-session-${Date.now()}`,
      percent: this.localDb.getPendingChanges().length === 0 ? 100 : 50,
      active: !this.isPaused,
      failedCount: this.failedSyncsCount,
      queueSize: this.localDb.getPendingChanges().length
    };
  }

  public setOnline(status: boolean): void {
    this.isOnline = status;
  }
}
