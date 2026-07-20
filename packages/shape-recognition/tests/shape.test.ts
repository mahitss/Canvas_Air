import { describe, it, expect } from "vitest";
import { DouglasPeuckerSimplifier } from "../src/geometry/simplifier";
import { FeatureExtractor } from "../src/features/extractor";
import { DollarClassifier } from "../src/classifiers/dollar";
import { RuleBasedClassifier } from "../src/classifiers/rule_based";
import { SnappingEngine } from "../src/snapping/snap";
import { ShapeRecognitionPipeline } from "../src/pipeline";
import { Point2D } from "../src/types";

describe("Douglas-Peucker Simplification", () => {
  it("should reduce redundant points along straight segments", () => {
    const rawPath: Point2D[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0.1 }, // slight noise
      { x: 10, y: 0 },
      { x: 15, y: -0.1 }, // slight noise
      { x: 20, y: 0 }
    ];

    const simplified = DouglasPeuckerSimplifier.simplify(rawPath, 1.0);
    // Epsilon is 1.0, so the noises (0.1, -0.1) are simplified, leaving only start and end points
    expect(simplified.length).toBe(2);
    expect(simplified[0]!.x).toBe(0);
    expect(simplified[1]!.x).toBe(20);
  });
});

describe("Feature Extractor Measurements", () => {
  it("should calculate shoelace area, centroid and perimeter", () => {
    // 100x100 square path returning close to start
    const squarePath: Point2D[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 5 }
    ];

    const features = FeatureExtractor.extract(squarePath);
    expect(features.area).toBe(10000);
    expect(features.perimeter).toBe(395);
    expect(features.centroid.x).toBe(40);
    expect(features.centroid.y).toBe(41);
    expect(features.isClosed).toBe(true);
  });
});

describe("Geometric Rule & Dollar Classifiers", () => {
  it("should recognize straight lines", () => {
    const linePath: Point2D[] = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 }
    ];

    const features = FeatureExtractor.extract(linePath);
    const prediction = RuleBasedClassifier.classify(features, linePath);
    expect(prediction.shapeType).toBe("line");
    expect(prediction.confidence).toBeGreaterThan(0.9);
  });

  it("should classify circular shapes using the Dollar classifier", () => {
    const dollar = new DollarClassifier();
    
    // Draw raw circle coordinates
    const circlePoints: Point2D[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = (i * Math.PI * 2) / 30;
      circlePoints.push({ x: 100 + Math.cos(angle) * 50, y: 100 + Math.sin(angle) * 50 });
    }

    const prediction = dollar.classify(circlePoints);
    expect(prediction.shapeType).toBe("circle");
    expect(prediction.confidence).toBeGreaterThan(0.8);
  });
});

describe("Grid & Angle Snapping Solvers", () => {
  it("should snap points close to grid lines and angles to steps", () => {
    const snapping = new SnappingEngine({
      gridSize: 20,
      snapDistance: 5,
      angleSnapStepDeg: 15
    });

    // 1. Grid snapping check
    // Point (18, 3) is very close to (20, 0) (dx=2, dy=3, dist = sqrt(13) = 3.6 <= 5)
    const p1 = snapping.snapPoint({ x: 18, y: 3 });
    expect(p1.x).toBe(20);
    expect(p1.y).toBe(0);

    // Point (14, 10) is too far (dist = sqrt(36 + 100) = 11.6 > 5), should not snap
    const p2 = snapping.snapPoint({ x: 14, y: 10 });
    expect(p2.x).toBe(14);
    expect(p2.y).toBe(10);

    // 2. Angle snapping check
    // 7 degrees in rad snaps to 0 degrees rad (step = 15 deg)
    const angleRad = (7 * Math.PI) / 180.0;
    const snappedRad = snapping.snapAngle(angleRad);
    expect(snappedRad).toBe(0);
  });
});
