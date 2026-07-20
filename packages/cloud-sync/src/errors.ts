export class CloudSyncException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

export class WorkspaceException extends CloudSyncException {
  constructor(reason: string) {
    super(`WorkspaceError: Workspace mutation failed: ${reason}`);
  }
}

export class SyncException extends CloudSyncException {
  constructor(reason: string) {
    super(`SyncError: Sync pipeline failed: ${reason}`);
  }
}

export class AssetException extends CloudSyncException {
  constructor(reason: string) {
    super(`AssetError: Asset sync failed: ${reason}`);
  }
}

export class ConflictException extends CloudSyncException {
  constructor(reason: string) {
    super(`ConflictError: Overlaps resolution failed: ${reason}`);
  }
}

export class SecurityException extends CloudSyncException {
  constructor(reason: string) {
    super(`SecurityError: Cryptographic validation failed: ${reason}`);
  }
}
