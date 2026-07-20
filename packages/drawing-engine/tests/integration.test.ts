import { describe, it, expect, vi, beforeEach } from "vitest";
import { GestureDrawingBridge } from "../src/integration";
import { DrawingEngine } from "../src/engine";
import { DEFAULT_DRAWING_CONFIG } from "../src/config";
import { HandPresence } from "@visioncanvas/hand-tracking";

describe("GestureDrawingBridge Integration", () => {
  let drawingEngine: DrawingEngine;
  let mockTrackingEngine: any;
  let mockGestureEngine: any;
  let bridge: GestureDrawingBridge;

  const createHandPresence = (id: string, x: number, y: number): HandPresence => ({
    id,
    type: "right",
    confidence: 0.9,
    landmarks: {
      index_tip: { x, y, z: 0 },
      wrist: { x: 0, y: 0, z: 0 }
    } as any,
    timestamp: Date.now()
  });

  beforeEach(() => {
    drawingEngine = new DrawingEngine(DEFAULT_DRAWING_CONFIG);
    
    // Create HTML canvas element mock
    const canvas = {
      width: 800,
      height: 600,
      style: { width: "800px", height: "600px" },
      getContext: () => ({
        setTransform: () => {},
        scale: () => {},
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        arc: () => {},
        fill: () => {},
        drawImage: () => {}
      })
    };
    drawingEngine.setCanvas(canvas as any);

    // Mock engines
    let trackingCallback: any = null;
    mockTrackingEngine = {
      subscribe: vi.fn((cb) => {
        trackingCallback = cb;
        return () => {};
      }),
      triggerUpdate: (event: any) => trackingCallback && trackingCallback(event)
    };

    let gestureCallback: any = null;
    mockGestureEngine = {
      subscribe: vi.fn((cb) => {
        gestureCallback = cb;
        return () => {};
      }),
      triggerEvent: (event: any) => gestureCallback && gestureCallback(event)
    };

    bridge = new GestureDrawingBridge(drawingEngine, mockTrackingEngine, mockGestureEngine, {
      drawingGesture: "Pinch",
      minConfidence: 0.7,
      debounceTimeMs: 50 // small debounce for test speed
    });
    bridge.start();
  });

  it("should start stroke when drawing gesture starts and update points on tracking moves", () => {
    // 1. Send hand tracking landmarks
    const hand = createHandPresence("hand-1", 100, 150);
    mockTrackingEngine.triggerUpdate({
      type: "LandmarksUpdated",
      payload: { hand, frameId: "f1" }
    });

    // 2. Trigger gesture start
    mockGestureEngine.triggerEvent({
      type: "GestureStarted",
      payload: {
        gesture: {
          handId: "hand-1",
          gesture: "Pinch",
          confidence: 0.85,
          state: "started",
          timestamp: Date.now()
        }
      }
    });

    // Verify stroke started at tip coordinates
    const stroke = drawingEngine.getCurrentStroke();
    expect(stroke).not.toBeNull();
    expect(stroke!.points[0]!.x).toBe(100);
    expect(stroke!.points[0]!.y).toBe(150);

    // 3. Move hand coordinates
    const handMoved = createHandPresence("hand-1", 120, 170);
    mockTrackingEngine.triggerUpdate({
      type: "LandmarksUpdated",
      payload: { hand: handMoved, frameId: "f2" }
    });

    expect(drawingEngine.getCurrentStroke()!.points.length).toBe(2);
  });

  it("should support stroke continuity and debounce short gesture drops", async () => {
    vi.useFakeTimers();

    const hand = createHandPresence("hand-1", 100, 150);
    mockTrackingEngine.triggerUpdate({ type: "LandmarksUpdated", payload: { hand, frameId: "f1" } });
    mockGestureEngine.triggerEvent({
      type: "GestureStarted",
      payload: { gesture: { handId: "hand-1", gesture: "Pinch", confidence: 0.9, state: "started", timestamp: Date.now() } }
    });

    expect(drawingEngine.getCurrentStroke()).not.toBeNull();

    // End gesture (should trigger debounce window)
    mockGestureEngine.triggerEvent({
      type: "GestureEnded",
      payload: { handId: "hand-1", gesture: "Pinch", timestamp: Date.now() }
    });

    // The stroke should NOT be completed immediately
    expect(drawingEngine.getCurrentStroke()).not.toBeNull();

    // Start gesture again before 50ms timeout completes
    vi.advanceTimersByTime(20);
    mockGestureEngine.triggerEvent({
      type: "GestureStarted",
      payload: { gesture: { handId: "hand-1", gesture: "Pinch", confidence: 0.9, state: "started", timestamp: Date.now() } }
    });

    vi.advanceTimersByTime(40); // exceed the initial 50ms from start, but since it restarted it should remain active!
    expect(drawingEngine.getCurrentStroke()).not.toBeNull();

    // Clean up timers
    vi.useRealTimers();
    bridge.stop();
  });
});
