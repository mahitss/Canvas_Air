import { CanvasDocumentState } from "../types";
import { VersionHistoryEntry } from "../domain";

export class VersionManager {
  private readonly snapshots = new Map<number, CanvasDocumentState>();
  private readonly namedVersions = new Map<string, number>(); // name -> version
  private readonly timeline: VersionHistoryEntry[] = [];
  private readonly branches = new Map<string, number[]>(); // branchName -> versionList[]

  constructor() {
    this.branches.set("main", []);
  }

  /**
   * Commits a deep-copied snapshot of the state to the history catalog, adding timeline metadata.
   */
  public saveSnapshot(
    version: number,
    state: CanvasDocumentState,
    userId: string = "system",
    description: string = `Auto snapshot ${version}`,
    branchName: string = "main"
  ): void {
    const clone: CanvasDocumentState = {
      elements: JSON.parse(JSON.stringify(state.elements)),
      tombstoneSet: [...state.tombstoneSet],
      version
    };
    this.snapshots.set(version, clone);

    // Append timeline log
    this.timeline.push({
      version,
      snapshotUrl: `snapshot://v${version}`,
      timestamp: Date.now(),
      userId,
      description
    });

    // Add to branch
    let list = this.branches.get(branchName);
    if (!list) {
      list = [];
      this.branches.set(branchName, list);
    }
    list.push(version);
  }

  /**
   * Restores a document state from a previously saved snapshot version.
   */
  public restoreSnapshot(version: number): CanvasDocumentState | undefined {
    const original = this.snapshots.get(version);
    if (!original) return undefined;

    return {
      elements: JSON.parse(JSON.stringify(original.elements)),
      tombstoneSet: [...original.tombstoneSet],
      version
    };
  }

  /**
   * Names a version to support quick bookmarks.
   */
  public nameVersion(name: string, version: number): void {
    if (!this.snapshots.has(version)) {
      throw new Error(`HistoryError: Version ${version} snapshot does not exist`);
    }
    this.namedVersions.set(name, version);
  }

  public getVersionByName(name: string): CanvasDocumentState | undefined {
    const ver = this.namedVersions.get(name);
    return ver !== undefined ? this.restoreSnapshot(ver) : undefined;
  }

  public getTimeline(): VersionHistoryEntry[] {
    return [...this.timeline].sort((a, b) => b.timestamp - a.timestamp); // newest first
  }

  public getBranchHistory(branchName: string): number[] {
    return this.branches.get(branchName) ?? [];
  }

  /**
   * Creates a branch from an existing snapshot version.
   */
  public createBranch(newBranchName: string, fromVersion: number): void {
    if (!this.snapshots.has(fromVersion)) {
      throw new Error(`HistoryError: Cannot branch from missing version ${fromVersion}`);
    }
    this.branches.set(newBranchName, [fromVersion]);
  }

  public getSnapshotsList(): number[] {
    return Array.from(this.snapshots.keys()).sort((a, b) => a - b);
  }
}
export * from "../types";
export * from "../config";
