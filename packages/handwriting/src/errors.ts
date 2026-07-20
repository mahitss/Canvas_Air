export class HandwritingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HandwritingError";
  }
}

export class SegmentationError extends HandwritingError {
  constructor(message: string) {
    super(message);
    this.name = "SegmentationError";
  }
}

export class MathParserError extends HandwritingError {
  constructor(message: string) {
    super(message);
    this.name = "MathParserError";
  }
}
