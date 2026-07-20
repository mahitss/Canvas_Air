import { describe, it, expect } from "vitest";
import { HandLandmarkSmoother } from "../src/smoother";
import { HandPresence } from "../src/types";

describe("Hand Landmark Smoother Performance Benchmarks", () => {
  it("should benchmark smoothing loop execution time and memory throughput", () => {
    const smoother = new HandLandmarkSmoother();

    const mockHand: HandPresence = {
      id: "hand-right-1",
      type: "right",
      confidence: 0.95,
      timestamp: 1000,
      landmarks: {
        wrist: { x: 0.5, y: 0.5, z: 0.0 },
        thumb_cmc: { x: 0.4, y: 0.4, z: 0.0 },
        thumb_mcp: { x: 0.35, y: 0.35, z: 0.0 },
        thumb_ip: { x: 0.3, y: 0.3, z: 0.0 },
        thumb_tip: { x: 0.25, y: 0.25, z: 0.0 },
        index_mcp: { x: 0.45, y: 0.3, z: 0.0 },
        index_pip: { x: 0.45, y: 0.2, z: 0.0 },
        index_dip: { x: 0.45, y: 0.15, z: 0.0 },
        index_tip: { x: 0.45, y: 0.1, z: 0.0 },
        middle_mcp: { x: 0.5, y: 0.3, z: 0.0 },
        middle_pip: { x: 0.5, y: 0.18, z: 0.0 },
        middle_dip: { x: 0.5, y: 0.12, z: 0.0 },
        middle_tip: { x: 0.5, y: 0.08, z: 0.0 },
        ring_mcp: { x: 0.55, y: 0.31, z: 0.0 },
        ring_pip: { x: 0.55, y: 0.2, z: 0.0 },
        ring_dip: { x: 0.55, y: 0.14, z: 0.0 },
        ring_tip: { x: 0.55, y: 0.1, z: 0.0 },
        pinky_mcp: { x: 0.6, y: 0.33, z: 0.0 },
        pinky_pip: { x: 0.6, y: 0.24, z: 0.0 },
        pinky_dip: { x: 0.6, y: 0.18, z: 0.0 },
        pinky_tip: { x: 0.6, y: 0.14, z: 0.0 }
      }
    } as any;

    const iterations = 10000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      mockHand.timestamp = 1000 + i * 33; // 30 FPS simulations
      smoother.smooth(mockHand);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTimePerFrameUs = (totalTime * 1000) / iterations; // convert to microseconds

    console.log(`[BENCHMARK] Total time for ${iterations} frames: ${totalTime.toFixed(2)}ms`);
    console.log(`[BENCHMARK] Average latency per frame: ${avgTimePerFrameUs.toFixed(3)} microseconds`);

    // Enforce performance budget: average latency per frame must be under 500 microseconds
    expect(avgTimePerFrameUs).toBeLessThan(500);
  });
});
