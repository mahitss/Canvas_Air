export class SketchImageException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

export class InterpreterException extends SketchImageException {
  constructor(reason: string) {
    super(`InterpreterError: Stroke decomposition failed: ${reason}`);
  }
}

export class PromptBuilderException extends SketchImageException {
  constructor(reason: string) {
    super(`PromptBuilderError: Parameter validation failed: ${reason}`);
  }
}

export class GenerationException extends SketchImageException {
  constructor(reason: string) {
    super(`GenerationError: Generative Image service error: ${reason}`);
  }
}
