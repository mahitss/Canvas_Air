import { describe, it, expect, beforeEach, vi } from "vitest";
import { OptimizedGestureRecognitionEngine, RingBuffer } from "../src/optimized-engine";
import { IGestureProvider, IGestureLifecycleTracker } from "../src/interfaces";
import { HandPresence } from "@visioncanvas/hand-tracking";

describe("Optimized Gesture Engine & RingBuffer", () => {
  describe("RingBuffer", () => {
    it("should push items and slide correctly within fixed capacity limits", () => {
      const buffer = new RingBuffer<string>(3);
      expect(buffer.getLength()).toBe(0);

      buffer.push("A");
      buffer.push("B");
      buffer.push("C");
      expect(buffer.getLength()).toBe(3);
      expect(buffer.get(0)).toBe("A");
      expect(buffer.get(2)).toBe("C");

      // Push 4th item (overflowing capacity)
      buffer.push("D");
      expect(buffer.getLength()).toBe(3);
      expect(buffer.get(0)).toBe("B"); // Head advanced, "A" evicted
      expect(buffer.get(2)).toBe("D");
    });

    it("should clear successfully", () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      expect(buffer.getLength()).toBe(2);

      buffer.clear();
      expect(buffer.getLength()).toBe(0);
      expect(buffer.get(0)).toBeNull();
    });
  });

  describe("OptimizedGestureRecognitionEngine", () => {
    let engine: OptimizedGestureRecognitionEngine;
    let tracker: IGestureLifecycleTracker;

    beforeEach(() => {
      tracker = {
        track: vi.fn().mockReturnValue([])
      };
      engine = new OptimizedGestureRecognitionEngine(tracker);
    });

    const createHand = (timestamp: number): HandPresence => ({
      id: "hand-1",
      type: "right",
      confidence: 0.9,
      timestamp,
      landmarks: { wrist: { x: 0, y: 0, z: 0 } } as any
    });

    it("should process frames and register providers", async () => {
      const provider: IGestureProvider = {
        name: "Mock",
        detect: vi.fn().mockResolvedValue(null)
      };
      engine.registerProvider(provider);

      await engine.processHand(createHand(1000));
      expect(provider.detect).toHaveBeenCalled();
    });

    it("should adaptively throttle frame evaluation when classification latency is high", async () => {
      const slowProvider: IGestureProvider = {
        name: "SlowProvider",
        detect: vi.fn().mockImplementation(async () => {
          // Mock latency of 3ms
          const start = performance.now();
          while (performance.now() - start < 3.0) {}
          return null;
        })
      };
      engine.registerProvider(slowProvider);

      // Ingest 30 frames to trigger adaptive feedback loop
      for (let i = 0; i < 30; i++) {
        await engine.processHand(createHand(1000 + i * 30));
      }

      // Assert that process rate has successfully throttled to avoid overload
      expect(engine.getProcessRate()).toBeGreaterThan(1);
    });

    it("should benchmark frame processing latency under normal pipeline execution conditions", async () => {
      const fastProvider: IGestureProvider = {
        name: "Fast",
        detect: vi.fn().mockResolvedValue(null)
      };
      engine.registerProvider(fastProvider);

      const t0 = performance.now();
      const iterations = 5000;
      for (let i = 0; i < iterations; i++) {
        await engine.processHand(createHand(1000 + i * 30));
      }
      const t1 = performance.now();

      const totalTimeMs = t1 - t0;
      const avgTimeUs = (totalTimeMs * 1000) / iterations;

      console.log(`[BENCHMARK] Total time for ${iterations} frames: ${totalTimeMs.toFixed(2)}ms`);
      console.log(`[BENCHMARK] Average latency per frame: ${avgTimeUs.toFixed(3)} microseconds`);

      // Enforce target threshold limit (must be well below 50.0 microseconds average latency)
      expect(avgTimeUs).toBeLessThan(50);
    });
  });
});
