export type SessionRole = "owner" | "editor" | "commenter" | "viewer" | "guest";

export interface ParticipantPresence {
  userId: string;
  cursor: { x: number; y: number };
  viewport: { zoom: number; panX: number; panY: number };
  color: string;
  currentTool: string;
  isTyping: boolean;
  lastActive: number;
  selectedElementIds: string[];
  isDrawing: boolean;
  voiceStatus: "speaking" | "muted" | "silent";
  status: "active" | "idle" | "away";
}

export interface DocumentOperation {
  elementId: string;
  action: "insert" | "update" | "delete";
  value: any;
  timestamp: number;
  vectorClock: number;
  userId: string;
}

export interface CanvasDocumentState {
  elements: Record<string, any>;
  tombstoneSet: string[];
  version: number;
}

export interface CollaborationSession {
  id: string;
  name: string;
  ownerId: string;
  participants: Record<string, ParticipantPresence>;
  roles: Record<string, SessionRole>;
}

export interface NetworkTransport {
  broadcast(event: string, payload: any): void;
  sendTo(userId: string, event: string, payload: any): void;
  on(event: string, callback: (payload: any) => void): void;
}
