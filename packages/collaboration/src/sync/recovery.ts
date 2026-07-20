import { CollaborationSyncEngine } from "./sync_engine";

export class OfflineRecoveryEngine {
  private onlineStatus = true;

  constructor(
    private readonly syncEngine: CollaborationSyncEngine,
    private readonly onStateChanged?: (status: boolean) => void
  ) {}

  public isOnline(): boolean {
    return this.onlineStatus;
  }

  /**
   * Simulates network state drop.
   */
  public disconnect(): void {
    this.onlineStatus = false;
    this.onStateChanged?.(false);
  }

  /**
   * Recovers network link and triggers synchronization of pending local changes.
   */
  public async reconnect(): Promise<void> {
    this.onlineStatus = true;
    this.onStateChanged?.(true);

    // Reconcile and flush offline updates
    await this.syncEngine.synchronizeOfflineQueue();

    // Trigger resend of unacknowledged actions
    await this.syncEngine.retryUnacknowledged();
  }
}
