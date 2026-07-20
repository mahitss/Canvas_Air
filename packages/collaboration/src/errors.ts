export class CollaborationException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

export class SessionNotFoundException extends CollaborationException {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
  }
}

export class PermissionDeniedException extends CollaborationException {
  constructor(userId: string, action: string) {
    super(`Permission Denied: User ${userId} is unauthorized to execute ${action}`);
  }
}

export class SessionTimeoutException extends CollaborationException {
  constructor(sessionId: string) {
    super(`Session ${sessionId} has timed out due to inactivity`);
  }
}

export class ConflictResolutionException extends CollaborationException {
  constructor(reason: string) {
    super(`Conflict resolution failure: ${reason}`);
  }
}
