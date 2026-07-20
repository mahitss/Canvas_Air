export class SceneUnderstandingException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

export class ParserException extends SceneUnderstandingException {
  constructor(reason: string) {
    super(`ParserError: Input parsing failed: ${reason}`);
  }
}

export class DetectionProviderException extends SceneUnderstandingException {
  constructor(reason: string) {
    super(`DetectionProviderError: Provider transaction failed: ${reason}`);
  }
}

export class PlatformException extends SceneUnderstandingException {
  constructor(reason: string) {
    super(`PlatformError: Scene analysis failed: ${reason}`);
  }
}
