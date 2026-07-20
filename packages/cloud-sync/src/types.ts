export interface StorageEntry {
  key: string;
  val: string;
  checksum: number;
  timestamp: number;
}

export type ChangeAction = "create" | "update" | "delete";

export interface StorageChange {
  key: string;
  action: ChangeAction;
  val?: string;
  timestamp: number;
}

export interface Conflict {
  key: string;
  localEntry: StorageEntry;
  remoteEntry: StorageEntry;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingUploadCount: number;
  lastSyncTime?: number;
}

export interface StorageProviderAdapter {
  id: string;
  name: string;
  push(changes: StorageChange[]): Promise<void>;
  pull(lastTimestamp: number): Promise<StorageChange[]>;
}

export interface ConflictResolutionStrategy {
  resolve(conflict: Conflict): Promise<StorageEntry>;
}
