import { describe, it, expect } from "vitest";
import { ShapeRecognitionEngine } from "../src/engine";
import { Point2D } from "../src/types";

describe("Shape Recognition Engine Performance Benchmarks", () => {
  it("should process a large set of strokes with high throughput and low latency", () => {
    const engine = new ShapeRecognitionEngine();

    // 1. Generate 200 strokes mimicking drawing circles with 100 points each
    const strokesCount = 200;
    const pointsPerStroke = 100;
    const dataset: Point2D[][] = [];

    for (let s = 0; s < strokesCount; s++) {
      const strokePoints: Point2D[] = [];
      const centerX = 100 + s * 10;
      const centerY = 150 + s * 5;
      
      for (let p = 0; p < pointsPerStroke; p++) {
        const angle = (p * Math.PI * 2) / pointsPerStroke;
        strokePoints.push({
          x: centerX + Math.cos(angle) * 50,
          y: centerY + Math.sin(angle) * 50
        });
      }
      dataset.push(strokePoints);
    }

    // Warm up the engine to trigger JIT optimization compilation
    for (let i = 0; i < 10; i++) {
      engine.recognize(dataset[i]!);
    }

    // 2. Perform benchmarks under heavy load
    const t0 = performance.now();
    for (let s = 0; s < strokesCount; s++) {
      engine.recognize(dataset[s]!);
    }
    const t1 = performance.now();

    const totalTimeMs = t1 - t0;
    const avgLatencyMs = totalTimeMs / strokesCount;

    console.log(`[BENCHMARK] Recognized ${strokesCount} strokes (${pointsPerStroke} points each) in ${totalTimeMs.toFixed(2)}ms`);
    console.log(`[BENCHMARK] Average recognition latency: ${avgLatencyMs.toFixed(3)} ms per stroke`);

    // Verify average recognition latency is extremely low (under 1.5ms per stroke)
    expect(avgLatencyMs).toBeLessThan(1.5);
  });
});
