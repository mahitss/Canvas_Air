export interface WorkspaceMetadata {
  id: string;
  name: string;
  isFavorite: boolean;
  isArchived: boolean;
  lastOpenedAt: number;
  updatedAt: number;
}

export interface AssetRecord {
  assetId: string;
  workspaceId: string;
  type: "image" | "ai-asset" | "brush" | "template" | "font" | "resource";
  name: string;
  checksum: number;
  uri: string;
  sizeBytes: number;
}

export interface SyncProgress {
  sessionId: string;
  percent: number;
  active: boolean;
  failedCount: number;
  queueSize: number;
}

export interface NamedVersionSnapshot {
  snapshotId: string;
  workspaceId: string;
  name: string;
  timestamp: number;
  checksum: number;
}
