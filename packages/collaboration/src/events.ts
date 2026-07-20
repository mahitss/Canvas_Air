
export type CollaborationEventType =
  | "SessionCreated"
  | "SessionJoined"
  | "SessionLeft"
  | "PresenceUpdated"
  | "OperationApplied"
  | "HostMigrated"
  | "SyncFailed";

export interface CollaborationEvent {
  type: CollaborationEventType;
  sessionId: string;
  payload: any;
  timestamp: number;
}
