import { describe, it, expect, vi } from "vitest";
import { SceneEventBus } from "../src/events/event_bus";
import { SceneOptimizer } from "../src/debug/optimizations";
import { DetectedObject } from "../src/types";

describe("Object Detection Event Bus & Optimizations Suite", () => {
  it("should subscribe, publish events sequentially, and return logs history", () => {
    const bus = SceneEventBus.getInstance();
    bus.clearHistory();

    const handler = vi.fn();
    bus.subscribe("DetectionStarted", handler);

    bus.publish("DetectionStarted", { frameId: "f1" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.getHistory().length).toBe(1);
  });

  it("should skip frames, manage results cache, and fill GPU buffers", () => {
    SceneOptimizer.clearCache();

    // Frame skipping test
    const timestamp1 = 1000;
    const process1 = SceneOptimizer.shouldProcessFrame(timestamp1, 30);
    expect(process1).toBe(true);

    const timestamp2 = 1010; // only 10ms later (< 30ms limit)
    const process2 = SceneOptimizer.shouldProcessFrame(timestamp2, 30);
    expect(process2).toBe(false);

    // Caching test
    const mockResult: DetectedObject[] = [
      { id: "o1", label: "person", confidence: 0.9, x: 0, y: 0, w: 10, h: 10 }
    ];

    expect(SceneOptimizer.getCachedDetections("local://image")).toBeNull();
    SceneOptimizer.cacheDetections("local://image", mockResult);
    expect(SceneOptimizer.getCachedDetections("local://image")).toEqual(mockResult);

    // GPU buffer test
    const buffer = SceneOptimizer.fillGpuBuffer([10, 20]);
    expect(buffer.length).toBe(2);
    expect(SceneOptimizer.bindGpuTexture("tex-1")).toBe(true);
  });
});
