import { SceneGraph } from "../scene/graph";
import { Camera2D } from "../camera/camera";
import { GPUResourceManager } from "../gpu/manager";
import { ShaderManager } from "../shaders/manager";
import { PostProcessPipeline } from "../postprocess/pipeline";
import { DebugTools } from "../debug/tools";
import { RenderMonitoringService } from "../debug/monitoring";
import { FrameScheduler } from "../scheduler/scheduler";
import { RendererConfig, DEFAULT_RENDERER_CONFIG } from "../config";
import { FrameBudget, RenderingStatistics, BoundingBox } from "../types";
import { BaseRenderPass } from "../passes/base";
import { GeometryPass } from "../passes/geometry";
import { PostProcessPass } from "../passes/postprocess";
import { DebugPass } from "../passes/debug";

/**
 * Structured Render Command representation inside the Render Queue.
 */
export interface RenderCommand {
  id: string;
  layerId: string;
  zIndex: number;
  opacity: number;
  execute(ctx: CanvasRenderingContext2D): void;
}

/**
 * State Management tracker to optimize canvas context properties set calls.
 */
export class RenderStateTracker {
  private activeAlpha: number = 1.0;
  private activeStrokeStyle: string | null = null;
  private activeLineWidth: number | null = null;

  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  public setAlpha(alpha: number): void {
    if (this.activeAlpha !== alpha) {
      this.ctx.globalAlpha = alpha;
      this.activeAlpha = alpha;
    }
  }

  public setStrokeStyle(style: string): void {
    if (this.activeStrokeStyle !== style) {
      this.ctx.strokeStyle = style;
      this.activeStrokeStyle = style;
    }
  }

  public setLineWidth(width: number): void {
    if (this.activeLineWidth !== width) {
      this.ctx.lineWidth = width;
      this.activeLineWidth = width;
    }
  }

  public reset(): void {
    this.activeAlpha = 1.0;
    this.activeStrokeStyle = null;
    this.activeLineWidth = null;
    this.ctx.globalAlpha = 1.0;
  }
}

/**
 * Advanced Render Pipeline supporting:
 * - Double Buffering (offscreen canvas copy)
 * - Dirty Region Rendering (clipped context drawings)
 * - Render Queue (sorted z-index execution stacks)
 * - State Management cache layers
 */
export class RenderPipeline {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Double buffering offscreen canvas elements
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  // Render Queue cache
  private renderQueue: RenderCommand[] = [];

  // Dirty regions bounds culling
  private dirtyRegions: BoundingBox[] = [];

  // Render State Tracker
  private stateTracker: RenderStateTracker | null = null;

  // Pipeline sub-managers
  public scene: SceneGraph;
  public camera: Camera2D;
  public gpu: GPUResourceManager;
  public shaders: ShaderManager;
  public postprocess: PostProcessPipeline;
  public debug: DebugTools;
  public monitor: RenderMonitoringService;
  public scheduler: FrameScheduler;

  // Passes queue stack
  private passes: BaseRenderPass[] = [];

  constructor(
    scene: SceneGraph,
    camera: Camera2D,
    config: RendererConfig = DEFAULT_RENDERER_CONFIG
  ) {
    this.scene = scene;
    this.camera = camera;

    this.gpu = new GPUResourceManager();
    this.shaders = new ShaderManager();
    this.postprocess = new PostProcessPipeline(config);
    this.debug = new DebugTools();
    this.monitor = new RenderMonitoringService(this.gpu);

    // Register default passes stack
    this.registerPass(new GeometryPass());
    this.registerPass(new PostProcessPass());
    this.registerPass(new DebugPass());

    // Instantiate frame scheduler passing pipeline draw callback
    this.scheduler = new FrameScheduler(config, (budget: FrameBudget) => {
      this.renderFrame(budget);
    });
  }

  public setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // Initialize Double Buffering Offscreen Canvas
    if (typeof document !== "undefined") {
      this.offscreenCanvas = document.createElement("canvas");
      this.offscreenCanvas.width = canvas.width;
      this.offscreenCanvas.height = canvas.height;
      this.offscreenCtx = this.offscreenCanvas.getContext("2d");
    } else {
      // Node Headless mock fallback context setup
      this.offscreenCanvas = {
        width: canvas.width,
        height: canvas.height
      } as any;
      this.offscreenCtx = this.ctx;
    }

    if (this.offscreenCtx) {
      this.stateTracker = new RenderStateTracker(this.offscreenCtx);
    }
  }

  public registerPass(pass: BaseRenderPass): void {
    this.passes.push(pass);
    this.passes.sort((a, b) => a.priority - b.priority);
  }

  public getStatistics(): RenderingStatistics {
    return this.debug.getStats();
  }

  /**
   * Enqueues a render command onto the execution queue.
   */
  public enqueueCommand(cmd: RenderCommand): void {
    this.renderQueue.push(cmd);
  }

  /**
   * Clears the active Render Queue.
   */
  public clearQueue(): void {
    this.renderQueue = [];
  }

  /**
   * Flags a rectangular canvas region as dirty/requiring redraw.
   */
  public addDirtyRegion(region: BoundingBox): void {
    this.dirtyRegions.push(region);
  }

  /**
   * Clears active dirty region limits.
   */
  public clearDirtyRegions(): void {
    this.dirtyRegions = [];
  }

  /**
   * Returns unified union bounding limits of all dirty regions.
   */
  public getDirtyUnion(): BoundingBox | null {
    if (this.dirtyRegions.length === 0) return null;

    let xMin = Infinity;
    let yMin = Infinity;
    let xMax = -Infinity;
    let yMax = -Infinity;

    for (const r of this.dirtyRegions) {
      if (r.xMin < xMin) xMin = r.xMin;
      if (r.yMin < yMin) yMin = r.yMin;
      if (r.xMax > xMax) xMax = r.xMax;
      if (r.yMax > yMax) yMax = r.yMax;
    }

    return { xMin, yMin, xMax, yMax };
  }

  public getStateTracker(): RenderStateTracker | null {
    return this.stateTracker;
  }

  /**
   * Main rendering pipeline execution tick callback.
   * Leverages double-buffering and dirty region clipping.
   */
  public renderFrame(budget: FrameBudget): void {
    if (!this.canvas || !this.ctx || !this.offscreenCanvas || !this.offscreenCtx) {
      return;
    }

    const mainCtx = this.ctx;
    const canvas = this.canvas;
    const drawCtx = this.offscreenCtx;

    this.monitor.beginFrame();
    this.debug.beginFrame();

    // Reset optimized state caching limits
    if (this.stateTracker) {
      this.stateTracker.reset();
    }

    drawCtx.save();

    // 1. Dirty Region rendering: Set clipping area to bounding box union if present
    const dirtyUnion = this.getDirtyUnion();
    if (dirtyUnion) {
      drawCtx.beginPath();
      const clipWidth = dirtyUnion.xMax - dirtyUnion.xMin;
      const clipHeight = dirtyUnion.yMax - dirtyUnion.yMin;
      drawCtx.rect(dirtyUnion.xMin, dirtyUnion.yMin, clipWidth, clipHeight);
      drawCtx.clip();
      
      // Clear only the clipped dirty section in the offscreen buffer
      drawCtx.clearRect(dirtyUnion.xMin, dirtyUnion.yMin, clipWidth, clipHeight);
    } else {
      // Clear entire buffer
      drawCtx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const contextEnvelope = {
      canvas,
      ctx: drawCtx,
      camera: this.camera,
      scene: this.scene
    };

    let drawCalls = 0;
    let renderedCount = 0;
    let culledCount = 0;

    // 2. Execute registered render passes sequentially
    for (const pass of this.passes) {
      if (!pass.isEnabled) {
        continue;
      }

      if (pass.name === "DebugPass") {
        const dPass = pass as DebugPass;
        dPass.fps = this.debug.getStats().fps;
        dPass.drawCalls = drawCalls;
        dPass.culledCount = culledCount;
      }

      pass.execute(contextEnvelope, budget);

      if (pass.name === "GeometryPass") {
        const gPass = pass as GeometryPass;
        drawCalls = gPass.drawCallsCount;
        renderedCount = gPass.renderedNodesCount;
        culledCount = gPass.culledNodesCount;
      }
    }

    // 3. Render Queue Command Execution: Draw sorted commands (z-index ordered)
    if (this.renderQueue.length > 0) {
      this.renderQueue.sort((a, b) => a.zIndex - b.zIndex);
      for (const cmd of this.renderQueue) {
        drawCtx.save();
        if (this.stateTracker) {
          this.stateTracker.setAlpha(cmd.opacity);
        } else {
          drawCtx.globalAlpha = cmd.opacity;
        }
        cmd.execute(drawCtx);
        drawCtx.restore();
        drawCalls++;
      }
    }

    // Apply Post processing filter overlays (e.g. Vignette, Bloom screen draws)
    this.postprocess.applyFilters(drawCtx, this.offscreenCanvas);

    drawCtx.restore();

    // 4. Double Buffering swap: Copy the offscreen canvas context onto main visible context
    if (this.offscreenCanvas !== this.canvas) {
      if (dirtyUnion) {
        const w = dirtyUnion.xMax - dirtyUnion.xMin;
        const h = dirtyUnion.yMax - dirtyUnion.yMin;
        mainCtx.clearRect(dirtyUnion.xMin, dirtyUnion.yMin, w, h);
        mainCtx.drawImage(
          this.offscreenCanvas,
          dirtyUnion.xMin, dirtyUnion.yMin, w, h,
          dirtyUnion.xMin, dirtyUnion.yMin, w, h
        );
      } else {
        mainCtx.clearRect(0, 0, canvas.width, canvas.height);
        mainCtx.drawImage(this.offscreenCanvas, 0, 0);
      }
    }

    const gpuMemory = this.gpu.getStats().gpuMemoryUsedBytes;
    this.debug.endFrame(drawCalls, renderedCount, culledCount, gpuMemory);
    this.monitor.endFrame(drawCalls, drawCalls * 2, this.renderQueue.length);
  }
}
