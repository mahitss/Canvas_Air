import { describe, it, expect, beforeEach } from "vitest";
import { DrawingEngine } from "../src/engine";
import { DEFAULT_DRAWING_CONFIG } from "../src/config";
import { CatmullRomSmoother } from "../src/smoothing/splines";
import { ChaikinSmoother } from "../src/smoothing/chaikin";
import { BezierSmoother } from "../src/smoothing/bezier";
import { DrawingPoint } from "../src/types";

describe("Drawing Engine Math & Interpolation", () => {
  it("should calculate exact straight line Catmull-Rom points", () => {
    const points: DrawingPoint[] = [
      { x: 0, y: 0, pressure: 0.5, velocityX: 0, velocityY: 0, timestamp: 100 },
      { x: 10, y: 10, pressure: 0.5, velocityX: 0, velocityY: 0, timestamp: 200 },
      { x: 20, y: 20, pressure: 0.5, velocityX: 0, velocityY: 0, timestamp: 300 },
      { x: 30, y: 30, pressure: 0.5, velocityX: 0, velocityY: 0, timestamp: 400 },
    ];

    const smoothed = CatmullRomSmoother.smooth(points, 0.5, 4);
    // Interpolated segment points must also lie exactly on the y=x line
    for (const pt of smoothed) {
      expect(pt.y).toBeCloseTo(pt.x, 3);
    }
  });

  it("should smooth corner edges using Chaikin's corner-cutting", () => {
    const points: DrawingPoint[] = [
      { x: 0, y: 0, pressure: 0.5, velocityX: 0, velocityY: 0, timestamp: 100 },
      { x: 10, y: 20, pressure: 0.5, velocityX: 0, velocityY: 0, timestamp: 200 },
      { x: 20, y: 0, pressure: 0.5, velocityX: 0, velocityY: 0, timestamp: 300 },
    ];

    const smoothed = ChaikinSmoother.smooth(points, 1);
    // Chaikin smooths corners, so the sharp peak at (10,20) should be rounded down
    for (const pt of smoothed) {
      expect(pt.y).toBeLessThanOrEqual(17.5);
    }
  });

  it("should interpolate quadratic Bezier paths", () => {
    const points: DrawingPoint[] = [
      { x: 0, y: 0, pressure: 0.5, velocityX: 0, velocityY: 0, timestamp: 100 },
      { x: 10, y: 10, pressure: 0.5, velocityX: 0, velocityY: 0, timestamp: 200 },
      { x: 20, y: 0, pressure: 0.5, velocityX: 0, velocityY: 0, timestamp: 300 },
    ];

    const smoothed = BezierSmoother.smooth(points, 2);
    expect(smoothed.length).toBe(3); // 1 + steps(2) = 3
  });
});

describe("Layers Stack Manager", () => {
  let engine: DrawingEngine;

  beforeEach(() => {
    engine = new DrawingEngine(DEFAULT_DRAWING_CONFIG);
  });

  it("should create default base layer and add new layers", () => {
    expect(engine.layers.getLayers().length).toBe(1);
    
    const layer = engine.layers.addLayer("Ink Overlay");
    expect(engine.layers.getLayers().length).toBe(2);
    expect(layer.name).toBe("Ink Overlay");
  });

  it("should restrict drawing active layer toggles when locked", () => {
    const layer = engine.layers.addLayer("Locked Layer");
    engine.layers.setActiveLayer(layer.id);
    engine.layers.setLayerLock(layer.id, true);

    // Attempting startStroke should be blocked and currentStroke remains null
    engine.startStroke(100, 100);
    expect(engine.getCurrentStroke()).toBeNull();
  });
});

describe("Viewport Transform Calculations", () => {
  let engine: DrawingEngine;

  beforeEach(() => {
    engine = new DrawingEngine(DEFAULT_DRAWING_CONFIG);
  });

  it("should compute inverse transforms on zoom and pan translation coordinates", () => {
    engine.viewport.pan(100, 50);
    engine.viewport.zoomAt(0, 0, 2.0); // zoom 2x

    const screenPt = { x: 300, y: 250 };
    const worldPt = engine.viewport.screenToWorld(screenPt.x, screenPt.y);
    const projectedScreenPt = engine.viewport.worldToScreen(worldPt.x, worldPt.y);

    // Projection back and forth must yield identical original coordinate values
    expect(projectedScreenPt.x).toBeCloseTo(screenPt.x, 3);
    expect(projectedScreenPt.y).toBeCloseTo(screenPt.y, 3);
  });
});

describe("Command History Undo/Redo Engine", () => {
  let engine: DrawingEngine;

  beforeEach(() => {
    engine = new DrawingEngine(DEFAULT_DRAWING_CONFIG);
  });

  it("should manage drawing stroke actions in undo/redo stack layers", () => {
    expect(engine.history.canUndo()).toBe(false);

    // 1. Draw a stroke
    engine.startStroke(50, 50);
    engine.addPoint(60, 60);
    engine.completeStroke();

    expect(engine.getStrokes().length).toBe(1);
    expect(engine.history.canUndo()).toBe(true);

    // 2. Undo stroke action
    engine.undo();
    expect(engine.getStrokes().length).toBe(0);
    expect(engine.history.canRedo()).toBe(true);

    // 3. Redo stroke action
    engine.redo();
    expect(engine.getStrokes().length).toBe(1);
  });
});
