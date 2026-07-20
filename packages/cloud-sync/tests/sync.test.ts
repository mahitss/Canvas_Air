import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorageEngine } from "../src/storage/local";
import { ReplicationEngine } from "../src/replication/engine";
import { SyncScheduler } from "../src/scheduler/sync";
import { StorageProviderAdapter, StorageChange, StorageEntry } from "../src/types";

class MockStorageAdapter implements StorageProviderAdapter {
  public id = "mock-cloud-storage";
  public name = "Mock Cloud Sync Adapter";
  public pushedChanges: StorageChange[] = [];
  public pulledChanges: StorageChange[] = [];

  public async push(changes: StorageChange[]): Promise<void> {
    this.pushedChanges.push(...changes);
  }

  public async pull(lastTimestamp: number): Promise<StorageChange[]> {
    void lastTimestamp;
    return this.pulledChanges;
  }
}

describe("Cloud Sync & Offline-First Data Platform", () => {
  let localDb: LocalStorageEngine;
  let replication: ReplicationEngine;
  let adapter: MockStorageAdapter;

  beforeEach(() => {
    localDb = new LocalStorageEngine();
    replication = new ReplicationEngine();
    adapter = new MockStorageAdapter();
    localDb.clearStorage();
  });

  it("should set and retrieve local storage values with integrity checks", () => {
    localDb.setEntry("project-1", '{"name": "Visual Workspace"}');
    
    const entry = localDb.getEntry("project-1");
    expect(entry).not.toBeNull();
    expect(entry?.val).toBe('{"name": "Visual Workspace"}');

    // Corruption test: tamper checksum value
    if (entry) {
      entry.checksum = 999999;
      expect(() => localDb.getEntry("project-1")).toThrow("Data integrity check failed");
    }
  });

  it("should buffer modifications locally when operating offline", async () => {
    localDb.setEntry("layer-1", "{}");
    localDb.setEntry("layer-2", "{}");

    const changes = localDb.getPendingChanges();
    expect(changes.length).toBe(2);
    expect(changes[0].key).toBe("layer-1");

    // If offline, replication sync does nothing and pending changes remain in queue
    await replication.sync(localDb);
    expect(localDb.getPendingChanges().length).toBe(2);
  });

  it("should synchronize local modifications to cloud adapters when online", async () => {
    replication.registerAdapter(adapter);
    replication.selectAdapter(adapter.id);

    localDb.setEntry("layer-1", '{"visible": true}');
    expect(localDb.getPendingChanges().length).toBe(1);

    await replication.sync(localDb);
    
    // Changes should be cleared from local queue and pushed to remote adapter
    expect(localDb.getPendingChanges().length).toBe(0);
    expect(adapter.pushedChanges.length).toBe(1);
    expect(adapter.pushedChanges[0].key).toBe("layer-1");
    expect(adapter.pushedChanges[0].val).toBe('{"visible": true}');
  });

  it("should resolve conflicts using pluggable Last-Write-Wins rules", async () => {
    replication.registerAdapter(adapter);
    replication.selectAdapter(adapter.id);

    // Local entry timestamp: 100
    localDb.setEntry("document-config", "local-value-old", 100);

    // Remote update timestamp: 200 (newer)
    adapter.pulledChanges = [
      { key: "document-config", action: "update", val: "remote-value-new", timestamp: 200 }
    ];

    await replication.sync(localDb);

    const resolved = localDb.getEntry("document-config");
    expect(resolved?.val).toBe("remote-value-new"); // Remote wins because it has a newer timestamp
  });

  it("should start and stop background sync loops inside SyncScheduler", () => {
    const scheduler = new SyncScheduler(100);
    expect(scheduler.isRunning()).toBe(false);

    scheduler.startSyncLoop(localDb, replication);
    expect(scheduler.isRunning()).toBe(true);

    scheduler.stopSyncLoop();
    expect(scheduler.isRunning()).toBe(false);
  });
});
