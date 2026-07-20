import { describe, it, expect } from "vitest";
import { SHAPE_RECOGNITION_TOKENS } from "../src/di";
import { ShapeRecognitionError, InvalidPointsError, ClassifierExecutionError } from "../src/errors";
import { ShapeRecognizedEvent, ShapeRecognitionFailedEvent } from "../src/events";

describe("Shape Recognition Architecture & Types", () => {
  it("should contain all required DI symbols", () => {
    expect(SHAPE_RECOGNITION_TOKENS.ShapeRecognitionEngine).toBe(Symbol.for("IShapeRecognitionEngine"));
    expect(SHAPE_RECOGNITION_TOKENS.ShapeClassifier).toBe(Symbol.for("IShapeClassifier"));
    expect(SHAPE_RECOGNITION_TOKENS.SnappingEngine).toBe(Symbol.for("ISnappingEngine"));
    expect(SHAPE_RECOGNITION_TOKENS.VectorEngine).toBe(Symbol.for("IVectorEngine"));
    expect(SHAPE_RECOGNITION_TOKENS.ShapeEventBus).toBe(Symbol.for("IShapeRecognitionEventBus"));
  });

  it("should instantiate custom error subclasses with proper prototype inheritance", () => {
    const err = new InvalidPointsError("Insufficient points");
    expect(err).toBeInstanceOf(ShapeRecognitionError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Insufficient points");
    expect(err.name).toBe("InvalidPointsError");

    const execErr = new ClassifierExecutionError("Classifier crash");
    expect(execErr).toBeInstanceOf(ShapeRecognitionError);
    expect(execErr.message).toBe("Classifier crash");
    expect(execErr.name).toBe("ClassifierExecutionError");
  });

  it("should validate shape recognition event type structural contracts", () => {
    const successEvent: ShapeRecognizedEvent = {
      type: "ShapeRecognized",
      payload: {
        prediction: {
          shapeType: "circle",
          confidence: 0.95,
          recognitionTimeMs: 1.2,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          corners: [],
          vectorData: null,
          recognitionSource: "rules"
        }
      },
      timestamp: Date.now()
    };

    expect(successEvent.type).toBe("ShapeRecognized");
    expect(successEvent.payload.prediction.shapeType).toBe("circle");
    expect(successEvent.payload.prediction.confidence).toBe(0.95);
  });
});
