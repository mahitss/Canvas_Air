
export interface VersionHistoryEntry {
  version: number;
  snapshotUrl: string;
  timestamp: number;
  userId: string;
  description: string;
}

export interface SharedEditingState {
  sessionId: string;
  documentId: string;
  lastSequenceNumber: number;
  activeEditorsCount: number;
}

export interface ClientConnectionState {
  userId: string;
  connected: boolean;
  lastHeartbeat: number;
  socketId: string;
}
