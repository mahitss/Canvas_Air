export class DiagramEngineException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

export class ParserException extends DiagramEngineException {
  constructor(reason: string) {
    super(`ParserError: Failed to parse sketch data: ${reason}`);
  }
}

export class ClassifierException extends DiagramEngineException {
  constructor(reason: string) {
    super(`ClassifierError: Failed to classify diagram: ${reason}`);
  }
}

export class RelationshipException extends DiagramEngineException {
  constructor(reason: string) {
    super(`RelationshipError: Spatial dependency graph build failed: ${reason}`);
  }
}
