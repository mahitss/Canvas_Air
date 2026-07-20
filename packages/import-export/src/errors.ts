export class IoException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

export class AdapterNotFoundException extends IoException {
  constructor(extension: string) {
    super(`No file format adapter registered for extension: '${extension}'`);
  }
}

export class InvalidDocumentException extends IoException {
  constructor(public readonly errors: string[]) {
    super(`Document validation failed: ${errors.join("; ")}`);
  }
}

export class CompatibilityException extends IoException {
  constructor(schemaVersion: number, hostVersion: number) {
    super(`Schema Version Conflict: Document runs version ${schemaVersion}, host expected ${hostVersion}`);
  }
}
