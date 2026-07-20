import { SessionRole, CollaborationSession, ParticipantPresence, DocumentOperation } from "../types";
import { SessionNotFoundException, PermissionDeniedException } from "../errors";

export class SessionManager {
  private readonly sessions = new Map<string, CollaborationSession>();
  private readonly operationHistory = new Map<string, DocumentOperation[]>(); // sessionId -> ops[]

  private readonly roleWeights: Record<SessionRole, number> = {
    owner: 5,
    editor: 4,
    commenter: 3,
    viewer: 2,
    guest: 1
  };

  /**
   * Initializes a new collaboration session.
   */
  public createSession(sessionId: string, ownerId: string, name: string = "New Canvas"): void {
    const session: CollaborationSession = {
      id: sessionId,
      name,
      ownerId,
      participants: {
        [ownerId]: this.createDefaultPresence(ownerId)
      },
      roles: {
        [ownerId]: "owner"
      }
    };
    this.sessions.set(sessionId, session);
    this.operationHistory.set(sessionId, []);
  }

  public getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Adds a user to the session, assigning them an authorized role.
   */
  public joinSession(sessionId: string, userId: string, role: SessionRole): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundException(sessionId);
    }

    session.roles[userId] = role;
    session.participants[userId] = this.createDefaultPresence(userId);
  }

  /**
   * Handles user exit, triggering host migration checks if owner leaves.
   */
  public leaveSession(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    delete session.roles[userId];
    delete session.participants[userId];

    if (session.ownerId === userId) {
      this.migrateHost(sessionId);
    }
  }

  /**
   * Reconnects a user and fetches missed sync operations from the sequence log.
   */
  public reconnect(sessionId: string, userId: string, lastReceivedSequence: number): DocumentOperation[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundException(sessionId);
    }

    // Set user as active again
    if (session.participants[userId]) {
      session.participants[userId].lastActive = Date.now();
      session.participants[userId].status = "active";
    }

    const history = this.operationHistory.get(sessionId) ?? [];
    return history.filter((op) => op.vectorClock > lastReceivedSequence);
  }

  /**
   * Checks for user session timeouts and triggers sweeps / migrations on idle users.
   */
  public checkSessionTimeouts(sessionId: string, timeoutMs: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const now = Date.now();
    for (const [userId, presence] of Object.entries(session.participants)) {
      if (now - presence.lastActive > timeoutMs) {
        // User has timed out, make them leave
        this.leaveSession(sessionId, userId);
      }
    }
  }

  /**
   * Appends an operation to the session sequence log.
   */
  public logOperation(sessionId: string, op: DocumentOperation): void {
    const history = this.operationHistory.get(sessionId);
    if (!history) throw new SessionNotFoundException(sessionId);
    history.push(op);
  }

  /**
   * Migrates the owner role to the next highest-weighted active participant.
   */
  public migrateHost(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const activeParticipants = Object.keys(session.participants);
    if (activeParticipants.length === 0) {
      this.sessions.delete(sessionId);
      this.operationHistory.delete(sessionId);
      return;
    }

    // Sort by role weights descending
    activeParticipants.sort((a, b) => {
      const weightA = this.roleWeights[session.roles[a] ?? "guest"];
      const weightB = this.roleWeights[session.roles[b] ?? "guest"];
      return weightB - weightA;
    });

    const newOwnerId = activeParticipants[0]!;
    session.ownerId = newOwnerId;
    session.roles[newOwnerId] = "owner";
  }

  /**
   * Asserts whether a participant possesses a high enough role weight to execute actions.
   */
  public checkRole(sessionId: string, userId: string, requiredRole: SessionRole): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundException(sessionId);
    }

    const userRole = session.roles[userId] || "guest";
    const userWeight = this.roleWeights[userRole];
    const requiredWeight = this.roleWeights[requiredRole];

    if (userWeight < requiredWeight) {
      throw new PermissionDeniedException(userId, `execute action requiring role ${requiredRole}`);
    }
  }

  public transferOwnership(sessionId: string, currentOwnerId: string, newOwnerId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new SessionNotFoundException(sessionId);

    if (session.ownerId !== currentOwnerId) {
      throw new Error("Only current owners may transfer session ownership.");
    }

    session.ownerId = newOwnerId;
    session.roles[currentOwnerId] = "editor";
    session.roles[newOwnerId] = "owner";
  }

  private createDefaultPresence(userId: string): ParticipantPresence {
    return {
      userId,
      cursor: { x: 0, y: 0 },
      viewport: { zoom: 1, panX: 0, panY: 0 },
      color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
      currentTool: "pen",
      isTyping: false,
      lastActive: Date.now(),
      selectedElementIds: [],
      isDrawing: false,
      voiceStatus: "silent",
      status: "active"
    };
  }
}
