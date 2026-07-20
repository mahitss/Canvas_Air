import { ParticipantPresence } from "../types";

export class PresenceEngine {
  private readonly participants = new Map<string, ParticipantPresence>();

  /**
   * Updates or inserts a participant's coordinate, selection, tool selection, voice status, and typing states.
   */
  public updatePresence(userId: string, presence: Partial<ParticipantPresence>): void {
    const existing = this.participants.get(userId) || {
      userId,
      cursor: { x: 0, y: 0 },
      viewport: { zoom: 1, panX: 0, panY: 0 },
      color: "#000000",
      currentTool: "pen",
      isTyping: false,
      lastActive: Date.now(),
      selectedElementIds: [],
      isDrawing: false,
      voiceStatus: "silent" as const,
      status: "active" as const
    };

    const updated: ParticipantPresence = {
      userId,
      cursor: presence.cursor ?? existing.cursor,
      viewport: presence.viewport ?? existing.viewport,
      color: presence.color ?? existing.color,
      currentTool: presence.currentTool ?? existing.currentTool,
      isTyping: presence.isTyping ?? existing.isTyping,
      lastActive: Date.now(),
      selectedElementIds: presence.selectedElementIds ?? existing.selectedElementIds,
      isDrawing: presence.isDrawing ?? existing.isDrawing,
      voiceStatus: presence.voiceStatus ?? existing.voiceStatus,
      status: "active" // refresh active status on any update
    };

    this.participants.set(userId, updated);
  }

  public removeParticipant(userId: string): void {
    this.participants.delete(userId);
  }

  public getParticipants(): ParticipantPresence[] {
    return Array.from(this.participants.values());
  }

  /**
   * Runs idle detection. Shifts status to 'idle' or 'away' based on inactivity elapsed time.
   */
  public updateIdleStates(idleTimeoutMs: number, awayTimeoutMs: number): void {
    const now = Date.now();
    for (const p of this.participants.values()) {
      const elapsed = now - p.lastActive;
      if (elapsed > awayTimeoutMs) {
        p.status = "away";
      } else if (elapsed > idleTimeoutMs) {
        p.status = "idle";
      } else {
        p.status = "active";
      }
    }
  }

  /**
   * Sweeps and removes participants who have not updated active status within the timeout threshold.
   */
  public reapInactiveParticipants(timeoutMs: number): string[] {
    const now = Date.now();
    const reapedIds: string[] = [];

    for (const [id, p] of this.participants.entries()) {
      if (now - p.lastActive > timeoutMs) {
        reapedIds.push(id);
        this.participants.delete(id);
      }
    }

    return reapedIds;
  }
}
export * from "../types";
export * from "../config";
