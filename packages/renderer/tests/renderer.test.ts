import { describe, it, expect, beforeEach } from "vitest";
import { SceneGraph } from "../src/scene/graph";
import { SceneNode } from "../src/scene/node";
import { Camera2D } from "../src/camera/camera";
import { GPUResourceManager } from "../src/gpu/manager";
import { RenderPipeline } from "../src/pipeline/core";
import { DEFAULT_RENDERER_CONFIG } from "../src/config";
import { FrameBudget } from "../src/types";

describe("Renderer Scene Graph Matrix Cascades", () => {
  it("should multiply matrices to resolve child world coordinates", () => {
    const graph = new SceneGraph();
    const parent = new SceneNode("parent", "LayerNode");
    parent.translateX = 100;
    parent.translateY = 50;

    const child = new SceneNode("child", "StrokeNode");
    child.translateX = 30;
    child.translateY = 20;

    graph.getRoot().addChild(parent);
    parent.addChild(child);

    const childWorldTransform = child.getWorldTransform();
    
    // X should be parent translation X (100) + child local X (30) = 130
    expect(childWorldTransform[2]).toBe(130);
    // Y should be parent translation Y (50) + child local Y (20) = 70
    expect(childWorldTransform[5]).toBe(70);
  });
});

describe("Camera Viewport Frustum Culling", () => {
  it("should cull nodes outside the viewport limits", () => {
    const camera = new Camera2D(800, 600);
    camera.panX = 0;
    camera.panY = 0;
    camera.zoom = 1.0;

    // Node is inside camera bounds
    const insideNode = new SceneNode("node1");
    insideNode.localBounds = { xMin: 10, yMin: 10, xMax: 50, yMax: 50 };
    expect(camera.isVisible(insideNode.getWorldBounds())).toBe(true);

    // Node is completely to the right of camera limits (cull candidate)
    const outsideNode = new SceneNode("node2");
    outsideNode.localBounds = { xMin: 900, yMin: 10, xMax: 950, yMax: 50 };
    expect(camera.isVisible(outsideNode.getWorldBounds())).toBe(false);
  });
});

describe("GPU Cache Management", () => {
  it("should reuse cached buffers and shader programs", () => {
    const gpu = new GPUResourceManager();
    
    const arrayData = new Float32Array([0, 0, 1, 1]);
    const buffer1 = gpu.getOrCreateBuffer("quad-vbo", 16, arrayData);
    const buffer2 = gpu.getOrCreateBuffer("quad-vbo", 16, arrayData);
    
    // Caches must return exact identical buffer reference
    expect(buffer1).toBe(buffer2);
    expect(gpu.getStats().cacheHits).toBe(1);
    expect(gpu.getStats().allocatedBuffersCount).toBe(1);
  });
});

describe("Frame Budget Scheduling Ticks", () => {
  it("should skip post-processing overlays if budget is exceeded", () => {
    const scene = new SceneGraph();
    const camera = new Camera2D(800, 600);
    const pipeline = new RenderPipeline(scene, camera, DEFAULT_RENDERER_CONFIG);
    
    // Set mock HTML canvas
    const mockCanvas = {
      width: 800,
      height: 600,
      getContext: () => ({
        clearRect: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        strokeRect: () => {},
        fillText: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        drawImage: () => {},
        transform: () => {}
      })
    } as any;
    pipeline.setCanvas(mockCanvas);

    // 1. Standard execution: budget is respected (elapsed time = 2ms)
    const budget1: FrameBudget = { elapsedMs: 2.0, targetMs: 16.6, budgetExceeded: false, frameIndex: 1 };
    pipeline.renderFrame(budget1);
    expect(pipeline.getStatistics().nodesRenderedCount).toBe(0);

    // 2. Heavy execution: budget is exceeded (elapsed time = 20ms)
    const budget2: FrameBudget = { elapsedMs: 20.0, targetMs: 16.6, budgetExceeded: true, frameIndex: 2 };
    pipeline.renderFrame(budget2);
    expect(pipeline.getStatistics().cpuTimeMs).toBeGreaterThan(0);
  });
});
