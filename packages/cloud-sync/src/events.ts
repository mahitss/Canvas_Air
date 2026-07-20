export type CloudSyncEventType =
  | "SyncStarted"
  | "SyncCompleted"
  | "ConflictDetected"
  | "ConflictResolved"
  | "WorkspaceSynced"
  | "SyncFailed";

export interface CloudSyncEvent {
  type: CloudSyncEventType;
  payload: any;
  timestamp: number;
}
