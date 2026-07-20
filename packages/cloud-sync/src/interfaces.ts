import { WorkspaceMetadata, AssetRecord, SyncProgress, NamedVersionSnapshot } from "./domain";
import { StorageChange, Conflict, StorageEntry } from "./types";

export interface IWorkspaceManager {
  createWorkspace(name: string): Promise<WorkspaceMetadata>;
  openWorkspace(id: string): Promise<void>;
  renameWorkspace(id: string, newName: string): Promise<void>;
  archiveWorkspace(id: string): Promise<void>;
  deleteWorkspace(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<void>;
  getRecentWorkspaces(): Promise<WorkspaceMetadata[]>;
}

export interface ISyncEngine {
  triggerSync(): Promise<void>;
  resumeSync(): Promise<void>;
  pauseSync(): Promise<void>;
  getSyncProgress(): SyncProgress;
}

export interface IAssetManager {
  syncAsset(asset: AssetRecord): Promise<void>;
  getAssetPath(assetId: string): Promise<string>;
  deleteAsset(assetId: string): Promise<void>;
}

export interface IConflictResolver {
  resolveConflict(conflict: Conflict): Promise<StorageEntry>;
}

export interface IVersionManager {
  createSnapshot(workspaceId: string, name: string): Promise<NamedVersionSnapshot>;
  restoreSnapshot(snapshotId: string): Promise<void>;
  getHistory(workspaceId: string): Promise<NamedVersionSnapshot[]>;
}

export interface IOfflineQueue {
  enqueue(change: StorageChange): void;
  processQueue(): Promise<void>;
  clearQueue(): void;
  getQueueSize(): number;
}

export interface ISecurityService {
  encrypt(data: string): string;
  decrypt(cipher: string): string;
  verifyIntegrity(data: string, checksum: number): boolean;
  authenticate(token: string): Promise<boolean>;
}

export interface IMonitoringService {
  trackSyncLatency(ms: number): void;
  trackSyncFailure(): void;
  trackBandwidth(uploadedBytes: number, downloadedBytes: number): void;
  getSyncStats(): any;
}
