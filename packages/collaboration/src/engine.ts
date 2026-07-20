import { ConflictResolver } from "./crdt/resolver";
import { PresenceEngine } from "./presence/engine";
import { SessionManager } from "./session/manager";
import { VersionManager } from "./history/manager";
import { NetworkTransport, DocumentOperation, ParticipantPresence, SessionRole } from "./types";

export class CollaborationEngine {
  private resolver: ConflictResolver;
  private presence: PresenceEngine;
  private sessions: SessionManager;
  private versions: VersionManager;
  private transport: NetworkTransport;

  constructor(transport: NetworkTransport) {
    this.resolver = new ConflictResolver();
    this.presence = new PresenceEngine();
    this.sessions = new SessionManager();
    this.versions = new VersionManager();
    this.transport = transport;

    this.registerTransportListeners();
  }

  public getConflictResolver(): ConflictResolver {
    return this.resolver;
  }

  public getPresenceEngine(): PresenceEngine {
    return this.presence;
  }

  public getSessionManager(): SessionManager {
    return this.sessions;
  }

  public getVersionManager(): VersionManager {
    return this.versions;
  }

  /**
   * Initializes a collaboration session.
   */
  public createSession(sessionId: string, ownerId: string): void {
    this.sessions.createSession(sessionId, ownerId);
  }

  /**
   * Registers a participant and user roles within the session.
   */
  public joinSession(sessionId: string, userId: string, role: SessionRole): void {
    this.sessions.joinSession(sessionId, userId, role);
    this.presence.updatePresence(userId, { userId });
    
    // Broadcast user join event
    this.transport.broadcast("user_joined", { sessionId, userId, role });
  }

  /**
   * Removes a participant from the session.
   */
  public leaveSession(sessionId: string, userId: string): void {
    this.sessions.leaveSession(sessionId, userId);
    this.presence.removeParticipant(userId);

    this.transport.broadcast("user_left", { sessionId, userId });
  }

  /**
   * Synchronizes document operations after verifying participant role privileges.
   */
  public syncOperation(sessionId: string, userId: string, op: DocumentOperation): void {
    // 1. Authorize role credentials (minimum role: editor)
    this.sessions.checkRole(sessionId, userId, "editor");

    // 2. Resolve conflict
    const applied = this.resolver.applyOperation(op);

    // 3. Broadcast to peers if resolved successfully
    if (applied) {
      this.transport.broadcast("operation_synced", { sessionId, op });
    }
  }

  /**
   * Broadcasts cursor position updates to all session participants.
   */
  public broadcastPresence(sessionId: string, userId: string, partial: Partial<ParticipantPresence>): void {
    this.presence.updatePresence(userId, partial);
    
    const p = this.presence.getParticipants().find(x => x.userId === userId);
    if (p) {
      this.transport.broadcast("presence_broadcast", { sessionId, presence: p });
    }
  }

  private registerTransportListeners(): void {
    this.transport.on("operation_synced", (payload: any) => {
      if (payload && payload.op) {
        this.resolver.applyOperation(payload.op);
      }
    });

    this.transport.on("presence_broadcast", (payload: any) => {
      if (payload && payload.presence) {
        this.presence.updatePresence(payload.presence.userId, payload.presence);
      }
    });
  }
}
