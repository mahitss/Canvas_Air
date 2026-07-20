import { describe, it, expect, vi } from "vitest";
import { ImageIntegrationManager } from "../src/integration/image_integration";
import { ImageEventBus } from "../src/events";
import { ImageOptimizer } from "../src/debug/optimizations";

describe("AI Sketch-to-Image Integrations, Events & Optimizations", () => {
  it("should integrate generated image results and support undo/redo states", () => {
    const manager = new ImageIntegrationManager();

    const mockResult = {
      imageUrl: "https://gen.png",
      seed: 777,
      timeMs: 120,
      parameters: {
        style: "Watercolor",
        aspectRatio: "1:1",
        resolution: "512",
        creativity: 0.5,
        guidanceStrength: 7
      }
    };

    const canvasObj = manager.createCanvasImageObject(mockResult, { x: 50, y: 50, w: 200, h: 200 });
    expect(canvasObj.type).toBe("image");
    expect(canvasObj.properties.generatedMetadata.seed).toBe(777);

    // History stack test
    manager.recordState([canvasObj]);
    const undoRes = manager.undo();
    expect(undoRes).toEqual([]);

    const redoRes = manager.redo();
    expect(redoRes?.length).toBe(1);
  });

  it("should subscribe, publish events sequentially, and replay event history logs", () => {
    const bus = ImageEventBus.getInstance();
    bus.clearHistory();

    const handler = vi.fn();
    bus.subscribe("GenerationRequested", handler);

    bus.publish("GenerationRequested", { requestId: "req-1" });
    expect(handler).toHaveBeenCalledTimes(1);

    const history = bus.getReplayHistory();
    expect(history.length).toBe(1);
    expect(history[0]?.type).toBe("GenerationRequested");
  });

  it("should fetch cached prompts and compile concurrent requests in sequential batches", async () => {
    ImageOptimizer.clearCache();

    const mockResult = {
      imageUrl: "https://cached.png",
      seed: 123,
      timeMs: 50,
      parameters: {
        style: "Cartoon",
        aspectRatio: "1:1",
        resolution: "512",
        creativity: 0.5,
        guidanceStrength: 5
      }
    };

    expect(ImageOptimizer.getCachedResult("beautiful sky", "clouds")).toBeNull();

    // Cache it
    ImageOptimizer.cacheResult("beautiful sky", "clouds", mockResult);
    expect(ImageOptimizer.getCachedResult("beautiful sky", "clouds")).toEqual(mockResult);

    // Batching test
    const requests = [
      { prompt: "p1", options: {} },
      { prompt: "p2", options: {} },
      { prompt: "p3", options: {} }
    ];

    const executor = vi.fn().mockResolvedValue("done");
    const results = await ImageOptimizer.executeBatchedRequests(requests, 2, executor);
    expect(results).toEqual(["done", "done", "done"]);
    expect(executor).toHaveBeenCalledTimes(3);

    // Buffer test
    const buffered = ImageOptimizer.populateBuffer(["val1", "val2"]);
    expect(buffered.length).toBe(2);
  });
});
