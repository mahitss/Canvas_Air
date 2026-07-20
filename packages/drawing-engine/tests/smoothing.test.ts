import { describe, it, expect } from "vitest";
import { SmoothingService } from "../src/smoothing/service";
import { DrawingPoint } from "../src/types";

describe("SmoothingService", () => {
  const createPoint = (x: number, y: number): DrawingPoint => ({
    x,
    y,
    pressure: 0.5,
    velocityX: 0,
    velocityY: 0,
    timestamp: Date.now()
  });

  it("should smooth points using Bezier interpolation", () => {
    const service = new SmoothingService({
      algorithm: "bezier",
      strength: 0.5,
      stepsPerSegment: 4,
      preserveCorners: false,
      cornerAngleThreshold: 1.0
    });

    const points = [
      createPoint(0, 0),
      createPoint(50, 20),
      createPoint(100, 0)
    ];

    const result = service.smooth(points);
    expect(result.length).toBeGreaterThan(points.length);
    expect(result[0]!.x).toBe(0);
  });

  it("should smooth points using Catmull-Rom splines", () => {
    const service = new SmoothingService({
      algorithm: "catmull-rom",
      strength: 0.5,
      stepsPerSegment: 6,
      preserveCorners: false,
      cornerAngleThreshold: 1.0
    });

    const points = [
      createPoint(0, 0),
      createPoint(25, 10),
      createPoint(50, 0),
      createPoint(75, 10),
      createPoint(100, 0)
    ];

    const result = service.smooth(points);
    expect(result.length).toBeGreaterThan(points.length);
  });

  it("should preserve sharp corners when configured", () => {
    const service = new SmoothingService({
      algorithm: "catmull-rom",
      strength: 0.5,
      stepsPerSegment: 4,
      preserveCorners: true,
      cornerAngleThreshold: 0.8 // ~45 deg
    });

    // Traces a sharp 90-degree corner at (10, 0)
    const points = [
      createPoint(0, 0),
      createPoint(10, 0),
      createPoint(10, 10)
    ];

    const result = service.smooth(points);
    
    // Verify that the exact corner point (10, 0) is preserved in the smoothed output
    const hasCornerPoint = result.some((p) => Math.abs(p.x - 10) < 0.001 && Math.abs(p.y - 0) < 0.001);
    expect(hasCornerPoint).toBe(true);
  });

  it("should benchmark smoothing service execution latency", () => {
    const service = new SmoothingService({
      algorithm: "catmull-rom",
      strength: 0.5,
      stepsPerSegment: 4,
      preserveCorners: true,
      cornerAngleThreshold: 1.0
    });

    const points: DrawingPoint[] = [];
    for (let i = 0; i < 100; i++) {
      points.push(createPoint(i, Math.sin(i / 5) * 10));
    }

    const t0 = performance.now();
    const iterations = 500;
    for (let i = 0; i < iterations; i++) {
      service.smooth(points);
    }
    const t1 = performance.now();

    const totalTimeMs = t1 - t0;
    const avgTimeUs = (totalTimeMs * 1000) / iterations;

    console.log(`[BENCHMARK] Smoothing 100 points, total time for ${iterations} iterations: ${totalTimeMs.toFixed(2)}ms`);
    console.log(`[BENCHMARK] Average latency per smoothing run: ${avgTimeUs.toFixed(3)} microseconds`);

    // Latency must be extremely low (below 800 microseconds per path smoothing under CPUVM stress)
    expect(avgTimeUs).toBeLessThan(800);
  });
});
