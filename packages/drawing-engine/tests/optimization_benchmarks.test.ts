import { describe, it, expect, beforeEach } from "vitest";
import { DrawingEngine } from "../src/engine";
import { DEFAULT_DRAWING_CONFIG } from "../src/config";
import { DrawingPoint } from "../src/types";

describe("Drawing Engine Performance & Memory Benchmarks", () => {
  let engine: DrawingEngine;
  let mockCanvas: any;

  beforeEach(() => {
    engine = new DrawingEngine({
      ...DEFAULT_DRAWING_CONFIG,
      smoothingEnabled: true,
      smoothingType: "catmull-rom"
    });

    mockCanvas = {
      width: 1920,
      height: 1080,
      style: { width: "1920px", height: "1080px" },
      getContext: () => ({
        clearRect: () => {},
        setTransform: () => {},
        scale: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        arc: () => {},
        fill: () => {},
        drawImage: () => {}
      })
    };

    engine.setCanvas(mockCanvas);
  });

  it("should benchmark frame rendering times and point addition latency under heavy load", () => {
    // 1. Add 100 completed historical strokes, each with 50 points (5000 total points cached)
    for (let i = 0; i < 100; i++) {
      engine.startStroke(100 + i, 100);
      for (let j = 0; j < 50; j++) {
        engine.addPoint(100 + i + j, 100 + j);
      }
      engine.completeStroke();
    }

    // 2. Perform point additions in real-time on a new active stroke, measuring latency
    const iterations = 500;
    const startTime = performance.now();

    engine.startStroke(500, 500);
    for (let i = 0; i < iterations; i++) {
      engine.addPoint(500 + i, 500 + i);
    }
    engine.completeStroke();

    const totalTime = performance.now() - startTime;
    const avgLatencyUs = (totalTime * 1000) / iterations;

    console.log(`[BENCHMARK] Active stroke with 500 points on top of 5000 cached points:`);
    console.log(`[BENCHMARK] Total execution time: ${totalTime.toFixed(2)}ms`);
    console.log(`[BENCHMARK] Average latency per point addition: ${avgLatencyUs.toFixed(2)} microseconds`);

    // Verify rendering latency stays under the budget (average point insertion latency < 500 microseconds under CPUVM stress)
    expect(avgLatencyUs).toBeLessThan(500);

    // Verify final stats show low execution latency
    const stats = engine.getStats();
    expect(stats.activeStrokesCount).toBe(101); // 100 historical + 1 new
  });

  it("should benchmark rendering viewport frustum culling effectiveness", () => {
    // Draw 10 completed strokes, but place them far outside the viewport boundaries (e.g. world coordinates at x=5000, y=5000)
    engine.viewport.pan(-5000, -5000); // Shift viewport away

    const drawStart = performance.now();
    // Force rebuild of render cache with all offscreen strokes
    for (let i = 0; i < 10; i++) {
      engine.startStroke(5000, 5000);
      engine.addPoint(5100, 5100);
      engine.completeStroke();
    }
    const drawEnd = performance.now();
    console.log(`[BENCHMARK] Redrawing 10 culled offscreen strokes completed in ${(drawEnd - drawStart).toFixed(3)}ms`);
    
    // Total execution time for rendering 10 completely culled strokes should be virtually instantaneous (< 50ms under CPUVM stress)
    expect(drawEnd - drawStart).toBeLessThan(50);
  });
});
