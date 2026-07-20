import { LocalStorageEngine } from "../storage/local";
import { StorageProviderAdapter, StorageChange, StorageEntry } from "../types";
import { ConflictResolver } from "../conflict/resolver";

export class ReplicationEngine {
  private adapters: Map<string, StorageProviderAdapter> = new Map();
  private activeAdapterId: string | null = null;
  private resolver: ConflictResolver;
  private lastSyncTimestamp = 0;

  constructor() {
    this.resolver = new ConflictResolver();
  }

  public registerAdapter(adapter: StorageProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
    if (!this.activeAdapterId) {
      this.activeAdapterId = adapter.id;
    }
  }

  public selectAdapter(id: string): void {
    if (!this.adapters.has(id)) {
      throw new Error(`Cannot select unregistered storage adapter: ${id}`);
    }
    this.activeAdapterId = id;
  }

  public getResolver(): ConflictResolver {
    return this.resolver;
  }

  /**
   * Main sync workflow: pulls remote deltas, detects overlaps, resolves conflicts,
   * updates local databases, and pushes updates remotely.
   */
  public async sync(localDb: LocalStorageEngine): Promise<void> {
    if (!this.activeAdapterId) {
      // Offline-first fallback: continue buffering modifications locally
      return;
    }

    const adapter = this.adapters.get(this.activeAdapterId)!;
    const currentSyncStart = Date.now();

    // 1. Pull remote modifications since last run
    const remoteChanges = await adapter.pull(this.lastSyncTimestamp);

    // 2. Fetch locally buffered changes
    const localChanges = localDb.getPendingChanges();

    const localMap = new Map<string, StorageChange>();
    for (const change of localChanges) {
      localMap.set(change.key, change);
    }

    const remoteMap = new Map<string, StorageChange>();
    for (const change of remoteChanges) {
      remoteMap.set(change.key, change);
    }

    // 3. Scan and resolve overlapping conflict keys
    for (const [key, remoteChange] of remoteMap.entries()) {
      const localChange = localMap.get(key);

      if (localChange) {
        // Overlap detected: construct conflict models
        const localEntry = localDb.getEntry(key) || {
          key,
          val: localChange.val || "",
          checksum: localDb.calculateChecksum(localChange.val || ""),
          timestamp: localChange.timestamp
        };

        const remoteEntry: StorageEntry = {
          key,
          val: remoteChange.val || "",
          checksum: localDb.calculateChecksum(remoteChange.val || ""),
          timestamp: remoteChange.timestamp
        };

        const resolved = await this.resolver.resolveConflict({
          key,
          localEntry,
          remoteEntry
        });

        // Apply resolution outcome
        localDb.applyRemoteEntry(resolved);
        
        // Remove from pending delta collections since it is now synchronized
        localMap.delete(key);
      } else {
        // Safe incremental remote addition (no local overlap)
        if (remoteChange.action === "delete") {
          localDb.deleteEntry(key, remoteChange.timestamp);
        } else if (remoteChange.val !== undefined) {
          localDb.setEntry(key, remoteChange.val, remoteChange.timestamp);
        }
      }
    }

    // 4. Push remaining non-overlapping local updates remotely
    const outbound = Array.from(localMap.values());
    if (outbound.length > 0) {
      await adapter.push(outbound);
    }

    // Clean up successfully synced local transaction changes
    localDb.clearPendingChanges();
    this.lastSyncTimestamp = currentSyncStart;
  }
}
export * from "../types";
export * from "../config";
export * from "../storage/local";
export * from "../conflict/resolver";
export * from "../replication/engine";
