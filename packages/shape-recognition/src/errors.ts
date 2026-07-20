/**
 * Base error type for shape recognition exceptions.
 */
export class ShapeRecognitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShapeRecognitionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidPointsError extends ShapeRecognitionError {
  constructor(message = "Insufficient points provided for shape analysis.") {
    super(message);
    this.name = "InvalidPointsError";
  }
}

export class ClassifierExecutionError extends ShapeRecognitionError {
  constructor(message: string) {
    super(message);
    this.name = "ClassifierExecutionError";
  }
}
