import { describe, it, expect } from "vitest";
import { GeometryAnalyzer } from "../src/geometry/analyzer";
import { Point2D } from "../src/types";

describe("GeometryAnalyzer Structural Extraction", () => {
  it("should extract accurate stroke length and centroid of polylines", () => {
    // 40x30 L-shaped path
    const points: Point2D[] = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 30 }
    ];

    const features = GeometryAnalyzer.analyze(points);
    expect(features.strokeLength).toBe(70);
    expect(features.centroid.x).toBeCloseTo(26.667, 3);
    expect(features.centroid.y).toBeCloseTo(10, 3);
  });

  it("should compute exact bounding box and aspect ratio", () => {
    const points: Point2D[] = [
      { x: 50, y: 20 },
      { x: 150, y: 70 }
    ];

    const features = GeometryAnalyzer.analyze(points);
    expect(features.boundingBox.x).toBe(50);
    expect(features.boundingBox.y).toBe(20);
    expect(features.boundingBox.width).toBe(100);
    expect(features.boundingBox.height).toBe(50);
    expect(features.aspectRatio).toBe(2.0); // 100/50 = 2.0
  });

  it("should calculate correct angles and aggregate curvature", () => {
    // Straight line with a 90-degree turn
    const points: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 }
    ];

    const features = GeometryAnalyzer.analyze(points);
    expect(features.angles.length).toBe(1);
    // Heading shifts from 0 to PI/2 (90 deg)
    expect(features.angles[0]).toBeCloseTo(Math.PI / 2, 3);
    expect(features.curvature).toBeCloseTo(Math.PI / 2, 3);
  });

  it("should compute convex hull correctly, ignoring inner noise points", () => {
    // 100x100 square with noise points inside it
    const points: Point2D[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 50, y: 50 },  // Noise point inside
      { x: 20, y: 80 }   // Noise point inside
    ];

    const features = GeometryAnalyzer.analyze(points);
    const hullPoints = features.convexHull;

    // The hull must contain only the 4 outer corner points
    expect(hullPoints.length).toBe(4);
    expect(hullPoints.some(p => p.x === 0 && p.y === 0)).toBe(true);
    expect(hullPoints.some(p => p.x === 100 && p.y === 0)).toBe(true);
    expect(hullPoints.some(p => p.x === 100 && p.y === 100)).toBe(true);
    expect(hullPoints.some(p => p.x === 0 && p.y === 100)).toBe(true);
    expect(hullPoints.some(p => p.x === 50 && p.y === 50)).toBe(false);
  });

  it("should count axis direction changes accurately on a zig-zag path", () => {
    // Path moves left to right, but zig-zags up and down (Y changes sign)
    const points: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },  // Y increases
      { x: 20, y: 0 },   // Y decreases (1 change)
      { x: 30, y: 10 },  // Y increases (2 changes)
      { x: 40, y: 0 }    // Y decreases (3 changes)
    ];

    const features = GeometryAnalyzer.analyze(points);
    expect(features.directionChanges.x).toBe(0); // always moving right
    expect(features.directionChanges.y).toBe(3); // 3 direction reversals
  });

  it("should isolate peak corners through simplification", () => {
    // Simple triangle shape path
    const points: Point2D[] = [
      { x: 0, y: 0 },
      { x: 50, y: 80 },
      { x: 100, y: 0 },
      { x: 0, y: 0 }
    ];

    const features = GeometryAnalyzer.analyze(points);
    // The corners list should contain start point, top point, right point, and closing start point
    expect(features.corners.length).toBe(4);
    expect(features.corners[1]!.x).toBe(50);
    expect(features.corners[1]!.y).toBe(80);
  });
});
