import { describe, it, expect } from "vitest";
import { WorkspaceManager } from "../src/workspace/workspace_manager";
import { SyncEngine } from "../src/replication/sync_engine";
import { LocalStorageEngine } from "../src/storage/local";
import { AssetManager } from "../src/assets/asset_manager";
import { ConflictResolver, DeletionWinsStrategy, MergeStrategy } from "../src/conflict/resolver";
import { VersionManager } from "../src/version/version_manager";
import { OfflineQueue } from "../src/queue/offline_queue";
import { SecurityService } from "../src/security/security_service";
import { MonitoringService } from "../src/monitoring/monitoring_service";
import { Conflict, StorageEntry } from "../src/types";

describe("Cloud Sync & Workspace Platform", () => {
  it("should create, favorites, and archive workspaces", async () => {
    const manager = new WorkspaceManager();
    const ws = await manager.createWorkspace("New Workspace");

    expect(ws.name).toBe("New Workspace");
    expect(ws.isFavorite).toBe(false);

    await manager.toggleFavorite(ws.id);
    expect(manager.getRecentWorkspaces().then(list => list[0]?.isFavorite)).resolves.toBe(true);

    await manager.archiveWorkspace(ws.id);
    expect(manager.openWorkspace(ws.id)).rejects.toThrow();
  });

  it("should handle incremental pause/resume and sync progress", async () => {
    const db = new LocalStorageEngine();
    const engine = new SyncEngine(db);

    engine.pauseSync();
    expect(engine.getSyncProgress().active).toBe(false);

    db.setEntry("test-key", "val-1");
    expect(engine.getSyncProgress().queueSize).toBe(1);
  });

  it("should sync brushes, template fonts and AI assets", async () => {
    const manager = new AssetManager();
    const asset = {
      assetId: "brush-1",
      workspaceId: "ws-1",
      type: "brush" as const,
      name: "Calligraphy brush",
      checksum: 111,
      uri: "cloud://assets/brush-1.png",
      sizeBytes: 1024
    };

    await manager.syncAsset(asset);
    expect(await manager.getAssetPath("brush-1")).toBe("cloud://assets/brush-1.png");

    await manager.deleteAsset("brush-1");
    expect(manager.getAssetPath("brush-1")).rejects.toThrow();
  });

  it("should resolve conflict overlaps using DeletionWins and Merge strategies", async () => {
    const local: StorageEntry = { key: "k", val: "L", checksum: 0, timestamp: 100 };
    const remote: StorageEntry = { key: "k", val: "", checksum: 0, timestamp: 200 }; // remote delete
    const conflict: Conflict = { key: "k", localEntry: local, remoteEntry: remote };

    const delResolver = new ConflictResolver(new DeletionWinsStrategy());
    const delResult = await delResolver.resolveConflict(conflict);
    expect(delResult.val).toBe(""); // Deletion wins

    const mergeResolver = new ConflictResolver(new MergeStrategy());
    const mergeResult = await mergeResolver.resolveConflict({ key: "k", localEntry: local, remoteEntry: { key: "k", val: "R", checksum: 0, timestamp: 200 } });
    expect(mergeResult.val).toBe("L;R"); // Merged values
  });

  it("should commit snapshot versions and restore checkpoint states", async () => {
    const manager = new VersionManager();
    const snap = await manager.createSnapshot("ws-1", "Automatic checkpoint");

    expect(snap.name).toBe("Automatic checkpoint");
    expect(manager.getHistory("ws-1").then(l => l.length)).resolves.toBe(1);
    expect(manager.restoreSnapshot(snap.snapshotId)).resolves.toBeUndefined();
  });

  it("should prioritize offline queue changes", () => {
    const queue = new OfflineQueue();
    queue.enqueue({ key: "k1", action: "create", timestamp: 100 }, 1);
    queue.enqueue({ key: "k2", action: "delete", timestamp: 200 }, 10); // high priority

    expect(queue.getQueue()[0]?.change.key).toBe("k2");
    expect(queue.getQueueSize()).toBe(2);
  });

  it("should verify encryption/decryption, integrity checks and secure tokens", async () => {
    const security = new SecurityService();

    const encrypted = security.encrypt("ABC");
    expect(encrypted).toBe("DEF");
    expect(security.decrypt(encrypted)).toBe("ABC");

    const db = new LocalStorageEngine();
    const computed = db.calculateChecksum("ABC");
    expect(security.verifyIntegrity("ABC", computed)).toBe(true);
    expect(await security.authenticate("valid-mr-token")).toBe(true);
  });

  it("should track performance telemetry and latency runs count", () => {
    const monitor = new MonitoringService();
    monitor.trackSyncLatency(150);
    monitor.trackSyncLatency(250);
    monitor.trackSyncFailure();
    monitor.trackBandwidth(1000, 2000);

    const stats = monitor.getSyncStats();
    expect(stats.averageLatencyMs).toBe(200);
    expect(stats.failuresCount).toBe(1);
    expect(stats.uploadedBytes).toBe(1000);
  });
});
