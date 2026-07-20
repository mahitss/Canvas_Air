import { DrawingPoint, DrawingStroke, HistoryCommand, DrawingStats } from "./types";
import { DrawingEngineConfig, DEFAULT_DRAWING_CONFIG } from "./config";
import { BrushManager } from "./brush";
import { LayerManager } from "./layer/manager";
import { HistoryCommander } from "./history/commander";
import { ViewportTransform } from "./canvas/viewport";
import { PressureEstimator } from "./pressure/estimator";
import { DrawingEventEmitter, DrawingEventBus } from "./events";
import { CatmullRomSmoother } from "./smoothing/splines";
import { BezierSmoother } from "./smoothing/bezier";
import { ChaikinSmoother } from "./smoothing/chaikin";

export class DrawStrokeCommand implements HistoryCommand {
  public id: string;
  private engine: DrawingEngine;
  private stroke: DrawingStroke;

  constructor(engine: DrawingEngine, stroke: DrawingStroke) {
    this.id = `cmd-${Math.random().toString(36).substr(2, 9)}`;
    this.engine = engine;
    this.stroke = stroke;
  }

  public execute(): void {
    this.engine.addStrokeToHistory(this.stroke);
  }

  public undo(): void {
    this.engine.removeStrokeFromHistory(this.stroke.id);
  }
}

export class DrawingEngine {
  private config: DrawingEngineConfig;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  // Offscreen cache double buffering
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private isCacheDirty = true;

  // Viewport tracking state
  private lastRenderedViewport = {
    panX: 0,
    panY: 0,
    zoom: 1.0,
    rotation: 0,
    width: 0,
    height: 0,
    dpr: 1.0
  };

  // Reusable projection point caches to avoid GC allocation churn
  private cachedP0: DrawingPoint = { x: 0, y: 0, pressure: 1.0, velocityX: 0, velocityY: 0, timestamp: 0 };
  private cachedP1: DrawingPoint = { x: 0, y: 0, pressure: 1.0, velocityX: 0, velocityY: 0, timestamp: 0 };

  // Sub-modules (supports DIP dependency overrides)
  public brushes: BrushManager;
  public layers: LayerManager;
  public history: HistoryCommander;
  public viewport: ViewportTransform;
  public pressure: PressureEstimator;
  public events: DrawingEventEmitter;
  public eventBus: DrawingEventBus;

  // Active stroke state
  private currentStroke: DrawingStroke | null = null;
  private strokes: DrawingStroke[] = [];
  
  // Diagnostics
  private stats: DrawingStats = {
    activeStrokesCount: 0,
    pointsCollectedCount: 0,
    fps: 60,
    latencyMs: 1
  };

  // Keep track of the active layer ID to publish LayerChanged events
  private lastActiveLayerId: string | null = null;

  constructor(
    config: DrawingEngineConfig = DEFAULT_DRAWING_CONFIG,
    dependencies?: {
      brushes?: BrushManager;
      layers?: LayerManager;
      history?: HistoryCommander;
      viewport?: ViewportTransform;
      pressure?: PressureEstimator;
      events?: DrawingEventEmitter;
      eventBus?: DrawingEventBus;
    }
  ) {
    this.config = config;
    
    // Initialize components (supporting DIP overrides)
    this.brushes = dependencies?.brushes ?? new BrushManager(config);
    this.layers = dependencies?.layers ?? new LayerManager(config);
    this.history = dependencies?.history ?? new HistoryCommander(config);
    this.viewport = dependencies?.viewport ?? new ViewportTransform(config);
    this.pressure = dependencies?.pressure ?? new PressureEstimator(config);
    this.events = dependencies?.events ?? new DrawingEventEmitter();
    this.eventBus = dependencies?.eventBus ?? new DrawingEventBus();
  }

  public setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    
    // Initialize offscreen canvas double buffering
    if (typeof document !== "undefined") {
      this.offscreenCanvas = document.createElement("canvas");
    } else {
      // Mock element fallback for Node-based test runners
      this.offscreenCanvas = {
        width: canvas.width,
        height: canvas.height,
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
          fill: () => {}
        })
      } as any;
    }

    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = canvas.width;
      this.offscreenCanvas.height = canvas.height;
      this.offscreenCtx = this.offscreenCanvas.getContext("2d") as any;
    }

    this.isCacheDirty = true;
    
    // Auto resize if width/height are available
    if (canvas.clientWidth && canvas.clientHeight) {
      this.resize(canvas.clientWidth, canvas.clientHeight);
    } else {
      this.render();
    }
  }

  public resize(width: number, height: number, dpr: number = 1.0): void {
    this.viewport.resize(width, height, dpr);

    if (this.canvas && this.ctx) {
      // Set CSS dimensions
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;

      // Scale internal backbuffer
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;

      // Reset transforms and apply DPR scale
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }

    if (this.offscreenCanvas && this.offscreenCtx) {
      this.offscreenCanvas.width = width * dpr;
      this.offscreenCanvas.height = height * dpr;
      this.offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.offscreenCtx.scale(dpr, dpr);
    }

    this.isCacheDirty = true;
    this.render();
  }

  public getConfig(): DrawingEngineConfig {
    return this.config;
  }

  public getStrokes(): DrawingStroke[] {
    return [...this.strokes];
  }

  public getCurrentStroke(): DrawingStroke | null {
    return this.currentStroke;
  }

  public getStats(): DrawingStats {
    this.stats.activeStrokesCount = this.strokes.length;
    return { ...this.stats };
  }

  // --- Input coordinates pipelines ---

  public startStroke(screenX: number, screenY: number, screenZ?: number): void {
    const startTime = performance.now();
    const layerId = this.layers.getActiveLayerId();
    if (!layerId) {
      throw new Error("No active layer selected for drawing.");
    }
    
    const layer = this.layers.getLayers().find(l => l.id === layerId);
    if (layer?.isLocked) {
      return; // Cannot draw on locked layer
    }

    const worldPt = this.viewport.screenToWorld(screenX, screenY);
    const startPoint: DrawingPoint = {
      x: worldPt.x,
      y: worldPt.y,
      ...(screenZ !== undefined ? { z: screenZ } : {}),
      pressure: 0.5, // Default start pressure
      velocityX: 0.0,
      velocityY: 0.0,
      timestamp: Date.now()
    };

    const activeBrush = this.brushes.getActiveBrush();

    this.currentStroke = {
      id: `stroke-${Math.random().toString(36).substr(2, 9)}`,
      points: [startPoint],
      brushName: activeBrush.name,
      color: activeBrush.color,
      width: activeBrush.width,
      opacity: activeBrush.opacity,
      layerId: layerId,
      isLocked: false,
      isVisible: true
    };

    this.stats.pointsCollectedCount = 1;
    
    // Publish legacy and strongly-typed events
    this.events.emit("stroke-started", { strokeId: this.currentStroke.id, layerId });
    this.eventBus.publish({
      type: "StrokeStarted",
      payload: { strokeId: this.currentStroke.id, layerId },
      timestamp: Date.now()
    });

    this.render();

    this.stats.latencyMs = performance.now() - startTime;
  }

  public addPoint(screenX: number, screenY: number, screenZ?: number): void {
    const startTime = performance.now();
    if (!this.currentStroke) {
      return;
    }

    const worldPt = this.viewport.screenToWorld(screenX, screenY);
    const lastPoint = this.currentStroke.points[this.currentStroke.points.length - 1]!;
    const now = Date.now();
    const dt = Math.max(1, now - lastPoint.timestamp);

    // Compute screen coordinates velocities for pressure calculations
    const lastScreenPt = this.viewport.worldToScreen(lastPoint.x, lastPoint.y);
    const velocityX = (screenX - lastScreenPt.x) / dt;
    const velocityY = (screenY - lastScreenPt.y) / dt;

    const estimatedPressure = this.pressure.estimatePressure(velocityX, velocityY);

    const rawPoint: DrawingPoint = {
      x: worldPt.x,
      y: worldPt.y,
      ...(screenZ !== undefined ? { z: screenZ } : {}),
      pressure: estimatedPressure,
      velocityX,
      velocityY,
      timestamp: now
    };

    this.currentStroke.points.push(rawPoint);
    this.stats.pointsCollectedCount = this.currentStroke.points.length;
    
    // Publish legacy and strongly-typed events
    this.events.emit("stroke-updated", {
      strokeId: this.currentStroke.id,
      pointsCount: this.currentStroke.points.length
    });
    this.eventBus.publish({
      type: "StrokeUpdated",
      payload: { strokeId: this.currentStroke.id, pointsCount: this.currentStroke.points.length },
      timestamp: Date.now()
    });

    this.render();

    this.stats.latencyMs = performance.now() - startTime;
  }

  public completeStroke(): void {
    const startTime = performance.now();
    if (!this.currentStroke) {
      return;
    }

    // Apply smoothing algorithms before saving stroke
    if (this.config.smoothingEnabled && this.currentStroke.points.length >= 3) {
      let smoothedPoints = [...this.currentStroke.points];
      
      const type = this.config.smoothingType;
      if (type === "catmull-rom") {
        smoothedPoints = CatmullRomSmoother.smooth(
          smoothedPoints,
          this.config.catmullRomTension,
          6
        );
      } else if (type === "bezier") {
        smoothedPoints = BezierSmoother.smooth(smoothedPoints, 4);
      } else if (type === "chaikin") {
        smoothedPoints = ChaikinSmoother.smooth(smoothedPoints, this.config.chaikinIterations);
      }

      this.currentStroke.points = smoothedPoints;
    }

    const cmd = new DrawStrokeCommand(this, this.currentStroke);
    this.history.executeCommand(cmd);
    
    // Publish legacy and strongly-typed events
    this.events.emit("stroke-completed", {
      strokeId: this.currentStroke.id,
      pointsCount: this.currentStroke.points.length
    });
    this.eventBus.publish({
      type: "StrokeCompleted",
      payload: { strokeId: this.currentStroke.id, pointsCount: this.currentStroke.points.length },
      timestamp: Date.now()
    });
    this.eventBus.publish({
      type: "CanvasChanged",
      payload: { strokesCount: this.strokes.length },
      timestamp: Date.now()
    });

    this.currentStroke = null;
    this.isCacheDirty = true;
    this.render();

    this.stats.latencyMs = performance.now() - startTime;
  }

  public cancelStroke(): void {
    if (!this.currentStroke) {
      return;
    }
    
    // Publish legacy and strongly-typed events
    this.events.emit("stroke-cancelled", { strokeId: this.currentStroke.id });
    this.eventBus.publish({
      type: "StrokeCancelled",
      payload: { strokeId: this.currentStroke.id },
      timestamp: Date.now()
    });

    this.currentStroke = null;
    this.render();
  }

  // --- History operations ---

  public addStrokeToHistory(stroke: DrawingStroke): void {
    this.strokes.push(stroke);
    this.isCacheDirty = true;
    
    this.eventBus.publish({
      type: "CanvasChanged",
      payload: { strokesCount: this.strokes.length },
      timestamp: Date.now()
    });

    this.render();
  }

  public removeStrokeFromHistory(id: string): void {
    this.strokes = this.strokes.filter(s => s.id !== id);
    this.isCacheDirty = true;
    
    this.eventBus.publish({
      type: "CanvasChanged",
      payload: { strokesCount: this.strokes.length },
      timestamp: Date.now()
    });

    this.render();
  }

  public undo(): void {
    this.history.undo();
    this.events.emit("undo", undefined);
    
    this.eventBus.publish({
      type: "CanvasChanged",
      payload: { strokesCount: this.strokes.length },
      timestamp: Date.now()
    });

    this.isCacheDirty = true;
    this.render();
  }

  public redo(): void {
    this.history.redo();
    this.events.emit("redo", undefined);
    
    this.eventBus.publish({
      type: "CanvasChanged",
      payload: { strokesCount: this.strokes.length },
      timestamp: Date.now()
    });

    this.isCacheDirty = true;
    this.render();
  }

  public clear(): void {
    this.strokes = [];
    this.history.clear();
    this.layers.clear();
    this.viewport.reset();
    
    this.events.emit("canvas-cleared", undefined);
    this.eventBus.publish({
      type: "CanvasChanged",
      payload: { strokesCount: 0 },
      timestamp: Date.now()
    });

    this.isCacheDirty = true;
    this.render();
  }

  // --- Rendering Pipeline engine ---

  public render(): void {
    if (!this.canvas || !this.ctx) {
      return;
    }

    const ctx = this.ctx;
    const canvas = this.canvas;
    
    // Auto-detect viewport state changes to invalidate cache
    const vState = this.viewport.getState();
    const isViewportChanged =
      vState.panX !== this.lastRenderedViewport.panX ||
      vState.panY !== this.lastRenderedViewport.panY ||
      vState.zoom !== this.lastRenderedViewport.zoom ||
      vState.rotation !== this.lastRenderedViewport.rotation ||
      canvas.width !== this.lastRenderedViewport.width ||
      canvas.height !== this.lastRenderedViewport.height;

    if (isViewportChanged) {
      this.lastRenderedViewport = {
        panX: vState.panX,
        panY: vState.panY,
        zoom: vState.zoom,
        rotation: vState.rotation,
        width: canvas.width,
        height: canvas.height,
        dpr: this.viewport.getDevicePixelRatio()
      };
      this.isCacheDirty = true;
    }

    // Check layer changes
    if (this.layers.isDirty && this.layers.isDirty()) {
      this.isCacheDirty = true;
      this.layers.clearDirty();
    }

    // Publish LayerChanged event if active layer changed
    const activeLayerId = this.layers.getActiveLayerId();
    if (activeLayerId !== this.lastActiveLayerId) {
      this.lastActiveLayerId = activeLayerId;
      this.eventBus.publish({
        type: "LayerChanged",
        payload: { activeLayerId },
        timestamp: Date.now()
      });
    }

    // 1. Redraw cached layers onto offscreen canvas if cache is dirty
    if (this.isCacheDirty && this.offscreenCanvas && this.offscreenCtx) {
      const oCtx = this.offscreenCtx;
      oCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

      const layersList = this.layers.getLayers();
      for (const layer of layersList) {
        if (!layer.isVisible) {
          continue;
        }

        // Draw all completed strokes matching layer
        const layerStrokes = this.strokes.filter(s => s.layerId === layer.id && s.isVisible);
        for (const stroke of layerStrokes) {
          this.renderStrokePoints(oCtx, stroke, layer.opacity);
        }
      }
      this.isCacheDirty = false;
    }

    // 2. Clear main canvas screen pixels
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. Copy/blit the offscreen cached composite in one single call
    if (this.offscreenCanvas) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.offscreenCanvas as any, 0, 0);
      ctx.restore();
    }

    // 4. Render active temporary stroke on top of background cache
    if (this.currentStroke && this.currentStroke.isVisible) {
      const activeLayer = this.layers.getLayers().find(l => l.id === this.currentStroke!.layerId);
      const opacity = activeLayer ? activeLayer.opacity : 1.0;
      this.renderStrokePoints(ctx, this.currentStroke, opacity);
    }
  }

  private renderStrokePoints(
    ctx: CanvasRenderingContext2D,
    stroke: DrawingStroke,
    layerOpacity: number
  ): void {
    if (stroke.points.length < 2) {
      return;
    }

    const brush = this.brushes.getBrush(stroke.brushName);
    if (!brush) {
      return;
    }

    // Set brush color & dimensions mapping to stroke config
    brush.color = stroke.color;
    brush.width = stroke.width;
    brush.opacity = stroke.opacity * layerOpacity;

    // Viewport width and height for frustum culling
    const width = this.canvas ? this.canvas.width / this.viewport.getDevicePixelRatio() : 1920;
    const height = this.canvas ? this.canvas.height / this.viewport.getDevicePixelRatio() : 1080;

    // Iterate segments
    for (let i = 1; i < stroke.points.length; i++) {
      const w0 = stroke.points[i - 1]!;
      const w1 = stroke.points[i]!;

      // Project world points to screen viewport space
      const s0 = this.viewport.worldToScreen(w0.x, w0.y);
      const s1 = this.viewport.worldToScreen(w1.x, w1.y);

      // Frustum culling: check if segment coordinates are completely offscreen
      const minX = Math.min(s0.x, s1.x);
      const maxX = Math.max(s0.x, s1.x);
      const minY = Math.min(s0.y, s1.y);
      const maxY = Math.max(s0.y, s1.y);

      if (maxX < 0 || minX > width || maxY < 0 || minY > height) {
        continue; // Skip segment rendering
      }

      // Reuse pre-allocated projection points to avoid GC allocation churn
      this.cachedP0.x = s0.x;
      this.cachedP0.y = s0.y;
      this.cachedP0.z = w0.z;
      this.cachedP0.pressure = w0.pressure;
      this.cachedP0.velocityX = w0.velocityX;
      this.cachedP0.velocityY = w0.velocityY;
      this.cachedP0.timestamp = w0.timestamp;

      this.cachedP1.x = s1.x;
      this.cachedP1.y = s1.y;
      this.cachedP1.z = w1.z;
      this.cachedP1.pressure = w1.pressure;
      this.cachedP1.velocityX = w1.velocityX;
      this.cachedP1.velocityY = w1.velocityY;
      this.cachedP1.timestamp = w1.timestamp;

      brush.drawSegment(ctx, this.cachedP0, this.cachedP1);
    }
  }
}
