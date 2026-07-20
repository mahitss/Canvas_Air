import { describe, it, expect, vi } from "vitest";
import { RenderPipeline, RenderCommand } from "../src/pipeline/core";
import { SceneGraph } from "../src/scene/graph";
import { Camera2D } from "../src/camera/camera";
import { FrameBudget } from "../src/types";

describe("Render Pipeline Core Features", () => {
  it("should process Render Queue commands sorted by z-index", () => {
    const scene = new SceneGraph();
    const camera = new Camera2D(800, 600);
    const pipeline = new RenderPipeline(scene, camera);

    const execLog: string[] = [];

    const cmd1: RenderCommand = {
      id: "cmd1",
      layerId: "draw",
      zIndex: 5,
      opacity: 1.0,
      execute: vi.fn().mockImplementation(() => {
        execLog.push("cmd1");
      })
    };

    const cmd2: RenderCommand = {
      id: "cmd2",
      layerId: "ui",
      zIndex: 10,
      opacity: 0.8,
      execute: vi.fn().mockImplementation(() => {
        execLog.push("cmd2");
      })
    };

    const cmd3: RenderCommand = {
      id: "cmd3",
      layerId: "bg",
      zIndex: 1,
      opacity: 1.0,
      execute: vi.fn().mockImplementation(() => {
        execLog.push("cmd3");
      })
    };

    // Enqueue in random z-index order
    pipeline.enqueueCommand(cmd2);
    pipeline.enqueueCommand(cmd1);
    pipeline.enqueueCommand(cmd3);

    // Setup mock canvas
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      transform: vi.fn()
    } as any;

    const mockCanvas = {
      width: 800,
      height: 600,
      getContext: () => mockCtx
    } as any;

    pipeline.setCanvas(mockCanvas);

    const budget: FrameBudget = { elapsedMs: 1.0, targetMs: 16.6, budgetExceeded: false, frameIndex: 1 };
    pipeline.renderFrame(budget);

    // Assert commands executed in ascending z-index order: cmd3 (1), cmd1 (5), cmd2 (10)
    expect(execLog).toEqual(["cmd3", "cmd1", "cmd2"]);
    expect(cmd1.execute).toHaveBeenCalled();
    expect(cmd2.execute).toHaveBeenCalled();
    expect(cmd3.execute).toHaveBeenCalled();
  });

  it("should calculate dirty regions union bounds and clip drawing area", () => {
    const scene = new SceneGraph();
    const camera = new Camera2D(800, 600);
    const pipeline = new RenderPipeline(scene, camera);

    pipeline.addDirtyRegion({ xMin: 50, yMin: 50, xMax: 150, yMax: 150 });
    pipeline.addDirtyRegion({ xMin: 100, yMin: 100, xMax: 200, yMax: 220 });

    const union = pipeline.getDirtyUnion();
    expect(union).toEqual({ xMin: 50, yMin: 50, xMax: 200, yMax: 220 });

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      transform: vi.fn()
    } as any;

    const mockCanvas = {
      width: 800,
      height: 600,
      getContext: () => mockCtx
    } as any;

    pipeline.setCanvas(mockCanvas);

    const budget: FrameBudget = { elapsedMs: 1.0, targetMs: 16.6, budgetExceeded: false, frameIndex: 2 };
    pipeline.renderFrame(budget);

    // Assert clipping path was established matching dirty region boundaries
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.rect).toHaveBeenCalledWith(50, 50, 150, 170); // xMin, yMin, width, height
    expect(mockCtx.clip).toHaveBeenCalled();
  });

  it("should track render state updates and optimize Canvas property writes", () => {
    const scene = new SceneGraph();
    const camera = new Camera2D(800, 600);
    const pipeline = new RenderPipeline(scene, camera);

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      globalAlpha: 1.0,
      strokeStyle: "",
      lineWidth: 1
    } as any;

    const mockCanvas = {
      width: 800,
      height: 600,
      getContext: () => mockCtx
    } as any;

    pipeline.setCanvas(mockCanvas);
    const tracker = pipeline.getStateTracker()!;
    
    // Setting identical alpha values shouldn't write to context multiples times
    tracker.setAlpha(0.5);
    tracker.setAlpha(0.5);
    expect(mockCtx.globalAlpha).toBe(0.5);

    tracker.setStrokeStyle("#FF0000");
    tracker.setStrokeStyle("#FF0000");
    expect(mockCtx.strokeStyle).toBe("#FF0000");
  });
});
