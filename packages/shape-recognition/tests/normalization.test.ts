import { describe, it, expect } from "vitest";
import { ShapeNormalizationService } from "../src/normalization/service";
import { ShapePrediction } from "../src/types";

describe("ShapeNormalizationService", () => {
  const service = new ShapeNormalizationService(20, 10, 15); // gridSize=20, snapDistance=10, angleSnapStepDeg=15

  it("should normalize a circle with varying snapping strengths", () => {
    // Circle centered at raw (102, 104) with radius (18+22)/4 = 10
    const prediction: ShapePrediction = {
      shapeType: "circle",
      confidence: 0.9,
      recognitionTimeMs: 1.0,
      boundingBox: { x: 93, y: 93, width: 18, height: 22 },
      corners: [],
      vectorData: null,
      recognitionSource: "rules"
    };

    // Strength = 1.0 (Full snap)
    // Raw center is (102, 104), snapped center to grid (20) should be (100, 100)
    // Raw radius is 10, snapped radius to grid size / 2 (10) is 10
    const normalizedFull = service.normalize(prediction, 1.0);
    expect(normalizedFull.center?.x).toBe(100);
    expect(normalizedFull.center?.y).toBe(100);
    expect(normalizedFull.radius).toBe(10);
    expect(normalizedFull.metadata.snappingStrengthApplied).toBe(1.0);

    // Strength = 0.0 (No snap, returns raw)
    const normalizedNone = service.normalize(prediction, 0.0);
    expect(normalizedNone.center?.x).toBe(102);
    expect(normalizedNone.center?.y).toBe(104);
    expect(normalizedNone.radius).toBe(10);

    // Strength = 0.5 (Half snap)
    const normalizedHalf = service.normalize(prediction, 0.5);
    // Center x: 102 + (100 - 102) * 0.5 = 101
    // Center y: 104 + (100 - 104) * 0.5 = 102
    expect(normalizedHalf.center?.x).toBe(101);
    expect(normalizedHalf.center?.y).toBe(102);
    expect(normalizedHalf.radius).toBe(10);
  });

  it("should snap straight line coordinates and angle orientations", () => {
    // A line at a 7 degree angle (close to 0 degrees snap step)
    const prediction: ShapePrediction = {
      shapeType: "line",
      confidence: 0.95,
      boundingBox: { x: 0, y: 0, width: 100, height: 12 },
      corners: [
        { x: 2, y: 1 },    // starts near (0, 0)
        { x: 102, y: 13 }  // ends near (100, 12), length ~100
      ],
      vectorData: null,
      recognitionTimeMs: 1.0,
      recognitionSource: "rules"
    };

    // Full snap (strength = 1.0)
    // Start snaps to (0, 0). Angle snaps to 0. End becomes (100.71, 0)
    const normalized = service.normalize(prediction, 1.0);
    expect(normalized.vertices?.[0]?.x).toBe(0);
    expect(normalized.vertices?.[0]?.y).toBe(0);
    expect(normalized.rotation).toBe(0); // 7 degrees snaps to 0
    expect(normalized.metadata.rotationDegrees).toBe(0);
  });

  it("should normalize a square to equal width and height dimensions", () => {
    const prediction: ShapePrediction = {
      shapeType: "square",
      confidence: 0.92,
      boundingBox: { x: 9, y: -1, width: 100, height: 84 }, // raw center (59, 41)
      corners: [],
      vectorData: null,
      recognitionTimeMs: 1.0,
      recognitionSource: "dollar"
    };

    const normalized = service.normalize(prediction, 1.0);
    // Average raw dimensions: (100 + 84)/2 = 92
    // Snapped to grid size (20) = 100
    expect(normalized.width).toBe(100);
    expect(normalized.height).toBe(100);
    // Snapped center: (59, 41) -> (60, 40)
    expect(normalized.center?.x).toBe(60);
    expect(normalized.center?.y).toBe(40);
  });

  it("should normalize triangle corners using snapping", () => {
    const prediction: ShapePrediction = {
      shapeType: "triangle",
      confidence: 0.88,
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      corners: [
        { x: 48, y: 2 },
        { x: 99, y: 98 },
        { x: 3, y: 99 }
      ],
      vectorData: null,
      recognitionTimeMs: 1.0,
      recognitionSource: "dollar"
    };

    const normalized = service.normalize(prediction, 1.0);
    // (48, 2) snaps to (40, 0) (dx=8, dy=2, dist = sqrt(68) = 8.24 <= 10)
    // (99, 98) snaps to (100, 100) (dist = sqrt(5) = 2.23 <= 10)
    // (3, 99) snaps to (0, 100) (dist = sqrt(10) = 3.16 <= 10)
    expect(normalized.vertices?.[0]?.x).toBe(40);
    expect(normalized.vertices?.[0]?.y).toBe(0);
    expect(normalized.vertices?.[1]?.x).toBe(100);
    expect(normalized.vertices?.[1]?.y).toBe(100);
    expect(normalized.vertices?.[2]?.x).toBe(0);
    expect(normalized.vertices?.[2]?.y).toBe(100);
  });
});
