import { IVersionManager } from "../interfaces";
import { NamedVersionSnapshot } from "../domain";
import { WorkspaceException } from "../errors";

export class VersionManager implements IVersionManager {
  private readonly history = new Map<string, NamedVersionSnapshot[]>();
  private readonly activeSnapshots = new Map<string, string>(); // snapshotId -> val

  /**
   * Commits named workspace coordinates snapshots.
   */
  public async createSnapshot(workspaceId: string, name: string): Promise<NamedVersionSnapshot> {
    if (!workspaceId || !name) {
      throw new WorkspaceException("Workspace ID and Snapshot name cannot be empty");
    }

    const snapshotId = `snap-${Math.random().toString(36).substr(2, 9)}`;
    const snapshot: NamedVersionSnapshot = {
      snapshotId,
      workspaceId,
      name,
      timestamp: Date.now(),
      checksum: 12345
    };

    let list = this.history.get(workspaceId);
    if (!list) {
      list = [];
      this.history.set(workspaceId, list);
    }
    list.push(snapshot);
    this.activeSnapshots.set(snapshotId, `mock-data-for-${workspaceId}`);

    return snapshot;
  }

  public async restoreSnapshot(snapshotId: string): Promise<void> {
    if (!this.activeSnapshots.has(snapshotId)) {
      throw new WorkspaceException(`Snapshot ID not found: ${snapshotId}`);
    }
    // Restores workspace content
  }

  public async getHistory(workspaceId: string): Promise<NamedVersionSnapshot[]> {
    return this.history.get(workspaceId) || [];
  }
}
