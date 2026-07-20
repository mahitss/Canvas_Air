import { describe, it, expect, vi } from "vitest";
import { ShapeRecognitionEngine } from "../src/engine";
import { Point2D } from "../src/types";
import { ShapeRecognitionEvent } from "../src/events";

describe("ShapeRecognitionEngine Primitives", () => {
  const engine = new ShapeRecognitionEngine({
    confidenceThreshold: 0.70,
    simplifierTolerance: 2.0,
    autoCorrectionEnabled: true,
    snappingEnabled: false,
    snapping: {
      gridSize: 20,
      snapDistance: 5,
      angleSnapStepDeg: 15
    }
  });

  it("should recognize a straight line and publish event", () => {
    const points: Point2D[] = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 }
    ];

    const subscriber = vi.fn();
    const unsubscribe = engine.subscribe(subscriber);

    const prediction = engine.recognize(points);
    expect(prediction.shapeType).toBe("line");
    expect(prediction.confidence).toBeGreaterThan(0.9);

    expect(subscriber).toHaveBeenCalledTimes(1);
    const event = subscriber.mock.calls[0][0] as ShapeRecognitionEvent;
    expect(event.type).toBe("RecognitionCompleted");
    if (event.type === "RecognitionCompleted") {
      expect(event.payload.prediction.shapeType).toBe("line");
    }

    unsubscribe();
  });

  it("should recognize a circle", () => {
    const points: Point2D[] = [];
    for (let i = 0; i < 36; i++) {
      const angle = (i * Math.PI * 2) / 36;
      points.push({ x: 200 + Math.cos(angle) * 50, y: 200 + Math.sin(angle) * 50 });
    }

    const prediction = engine.recognize(points);
    expect(prediction.shapeType).toBe("circle");
    expect(prediction.confidence).toBeGreaterThan(0.8);
  });

  it("should recognize an ellipse", () => {
    const points: Point2D[] = [];
    for (let i = 0; i < 36; i++) {
      const angle = (i * Math.PI * 2) / 36;
      points.push({ x: 200 + Math.cos(angle) * 120, y: 200 + Math.sin(angle) * 45 });
    }

    const prediction = engine.recognize(points);
    expect(prediction.shapeType).toBe("ellipse");
    expect(prediction.confidence).toBeGreaterThan(0.75);
  });

  it("should recognize a square", () => {
    const points: Point2D[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 0 }
    ];

    const prediction = engine.recognize(points);
    expect(prediction.shapeType).toBe("square");
    expect(prediction.confidence).toBeGreaterThan(0.85);
  });

  it("should recognize a rectangle", () => {
    const points: Point2D[] = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 0 }
    ];

    const prediction = engine.recognize(points);
    expect(prediction.shapeType).toBe("rectangle");
    expect(prediction.confidence).toBeGreaterThan(0.85);
  });

  it("should recognize a triangle", () => {
    const points: Point2D[] = [
      { x: 50, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 50, y: 0 }
    ];

    const prediction = engine.recognize(points);
    expect(prediction.shapeType).toBe("triangle");
    expect(prediction.confidence).toBeGreaterThan(0.8);
  });

  it("should recognize a polygon", () => {
    const points: Point2D[] = [];
    for (let i = 0; i <= 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      points.push({ x: 100 + Math.cos(angle) * 50, y: 100 + Math.sin(angle) * 50 });
    }

    const prediction = engine.recognize(points);
    expect(prediction.shapeType).toBe("polygon");
    expect(prediction.confidence).toBeGreaterThan(0.8);
  });

  it("should recognize an arrow", () => {
    const points: Point2D[] = [];
    const shaftSteps = 20;
    for (let i = 0; i < shaftSteps; i++) {
      points.push({ x: -100 + (i / shaftSteps) * 200, y: 0 });
    }
    const wingSteps = 10;
    for (let i = 0; i < wingSteps; i++) {
      points.push({ x: 100 - (i / wingSteps) * 50, y: -(i / wingSteps) * 50 });
    }
    for (let i = 0; i < wingSteps; i++) {
      points.push({ x: 50 + (i / wingSteps) * 50, y: -50 + (i / wingSteps) * 50 });
    }
    for (let i = 0; i < wingSteps; i++) {
      points.push({ x: 100 - (i / wingSteps) * 50, y: (i / wingSteps) * 50 });
    }

    const prediction = engine.recognize(points);
    expect(prediction.shapeType).toBe("arrow");
    expect(prediction.confidence).toBeGreaterThan(0.7);
  });

  it("should fail gracefully on noise/scribble and dispatch failure event", () => {
    // Highly randomized squiggle scribble
    const points: Point2D[] = [
      { x: 10, y: 20 },
      { x: 50, y: 80 },
      { x: 12, y: 10 },
      { x: 99, y: 140 },
      { x: 30, y: 200 }
    ];

    const subscriber = vi.fn();
    const unsubscribe = engine.subscribe(subscriber);

    const prediction = engine.recognize(points);
    // Since it's noisy and does not match any template cleanly, it should be unknown or low confidence
    expect(prediction.confidence).toBeLessThan(0.70);

    expect(subscriber).toHaveBeenCalledTimes(1);
    const event = subscriber.mock.calls[0][0] as ShapeRecognitionEvent;
    expect(event.type).toBe("RecognitionFailed");
    if (event.type === "RecognitionFailed") {
      expect(event.payload.reason).toContain("below the required threshold");
    }

    unsubscribe();
  });
});
