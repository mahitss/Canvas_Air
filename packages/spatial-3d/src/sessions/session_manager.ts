import { ISpatialSessionManager } from "../interfaces";
import { SpatialSessionMetadata } from "../domain";
import { SpatialSessionException } from "../errors";

export class SpatialSessionManager implements ISpatialSessionManager {
  private readonly sessions = new Map<string, SpatialSessionMetadata>();

  /**
   * Spawns a spatial coordination session tracking active users and anchor statuses.
   */
  public async createSession(metadata: SpatialSessionMetadata): Promise<string> {
    if (!metadata || !metadata.sessionId) {
      throw new SpatialSessionException("Malformed session metadata parameters");
    }
    this.sessions.set(metadata.sessionId, {
      ...metadata,
      status: "active"
    });
    return metadata.sessionId;
  }

  public async resumeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SpatialSessionException(`Session ID not found: ${sessionId}`);
    }
    session.status = "active";
  }

  public async suspendSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SpatialSessionException(`Session ID not found: ${sessionId}`);
    }
    session.status = "suspended";
  }

  public async restoreSession(sessionId: string): Promise<void> {
    await this.resumeSession(sessionId);
  }

  public getSessionMetadata(sessionId: string): SpatialSessionMetadata | null {
    return this.sessions.get(sessionId) || null;
  }
}
