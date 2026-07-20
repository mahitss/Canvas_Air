import { StorageEntry, StorageChange } from "../types";

export class LocalStorageEngine {
  private db: Map<string, StorageEntry> = new Map();
  private pendingChanges: StorageChange[] = [];

  public calculateChecksum(val: string): number {
    let hash = 5381;
    for (let i = 0; i < val.length; i++) {
      hash = (hash * 33) ^ val.charCodeAt(i);
    }
    return hash >>> 0; // Ensure unsigned 32-bit integer
  }

  public setEntry(key: string, val: string, timestamp: number = Date.now()): void {
    const checksum = this.calculateChecksum(val);
    const exists = this.db.has(key);

    const entry: StorageEntry = {
      key,
      val,
      checksum,
      timestamp
    };

    this.db.set(key, entry);

    this.pendingChanges.push({
      key,
      action: exists ? "update" : "create",
      val,
      timestamp
    });
  }

  public getEntry(key: string): StorageEntry | null {
    const entry = this.db.get(key);
    if (!entry) return null;

    // Verify integrity checksum
    const computed = this.calculateChecksum(entry.val);
    if (computed !== entry.checksum) {
      throw new Error(`Data integrity check failed for key: ${key}. Expected checksum ${entry.checksum}, computed ${computed}.`);
    }

    return entry;
  }

  /**
   * Directly sets the storage entry bypassing the pending changes queue
   * (e.g., when syncing remote changes to local database).
   */
  public applyRemoteEntry(entry: StorageEntry): void {
    this.db.set(entry.key, entry);
  }

  public deleteEntry(key: string, timestamp: number = Date.now()): void {
    if (this.db.has(key)) {
      this.db.delete(key);
      this.pendingChanges.push({
        key,
        action: "delete",
        timestamp
      });
    }
  }

  public getPendingChanges(): StorageChange[] {
    return this.pendingChanges;
  }

  public clearPendingChanges(): void {
    this.pendingChanges = [];
  }

  public clearStorage(): void {
    this.db.clear();
    this.pendingChanges = [];
  }
}
export * from "../types";
export * from "../config";
