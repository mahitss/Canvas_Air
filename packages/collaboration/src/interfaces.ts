import { ParticipantPresence, DocumentOperation, SessionRole } from "./types";

export interface ICollaborationSessionManager {
  createSession(sessionId: string, ownerId: string, name?: string): void;
  joinSession(sessionId: string, userId: string, role: SessionRole): void;
  leaveSession(sessionId: string, userId: string): void;
  reconnect(sessionId: string, userId: string, lastReceivedSequence: number): Promise<DocumentOperation[]>;
  checkSessionTimeouts(sessionId: string, timeoutMs: number): void;
  transferOwnership(sessionId: string, currentOwnerId: string, newOwnerId: string): void;
}

export interface IPresenceEngine {
  updatePresence(userId: string, presence: Partial<ParticipantPresence>): void;
  removeParticipant(userId: string): void;
  getParticipants(): ParticipantPresence[];
  reapInactiveParticipants(timeoutMs: number): string[];
}

export interface IHistoryManager {
  appendOperation(sessionId: string, op: DocumentOperation): void;
  getHistory(sessionId: string): DocumentOperation[];
  rollbackToVersion(sessionId: string, version: number): void;
}

export interface ISynchronizer {
  syncState(sessionId: string, clientState: any): any;
  resolveConflicts(sessionId: string, operations: DocumentOperation[]): DocumentOperation[];
}

export interface ICollaborationPermissionManager {
  canEdit(sessionId: string, userId: string): boolean;
  canView(sessionId: string, userId: string): boolean;
}
