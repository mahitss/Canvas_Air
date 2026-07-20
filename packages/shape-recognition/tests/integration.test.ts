import { describe, it, expect, vi } from "vitest";
import { DrawingShapeBridge, IMinimalDrawingEngine } from "../src/integration/bridge";
import { ShapeRecognitionEngine } from "../src/engine";
import { ShapeRecognitionEvent } from "../src/events";

describe("Drawing Shape Integration Bridge", () => {
  it("should subscribe, process completed strokes asynchronously, and publish recognition events", async () => {
    // 1. Setup mock drawing engine
    const strokeId = "stroke-test-123";
    const rawPoints = [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      { x: 100, y: 100 }
    ];

    let registeredCallback: ((event: any) => void) | null = null;

    const mockDrawingEngine: IMinimalDrawingEngine = {
      getStrokes: () => [
        {
          id: strokeId,
          // Extra properties mimicking original DrawingPoint sequence (should be preserved)
          points: rawPoints.map(pt => ({
            ...pt,
            pressure: 0.5,
            timestamp: Date.now(),
            velocityX: 0,
            velocityY: 0
          }))
        }
      ],
      eventBus: {
        subscribe: (type, callback) => {
          expect(type).toBe("StrokeCompleted");
          registeredCallback = callback;
          return () => {
            registeredCallback = null;
          };
        }
      }
    };

    // 2. Setup recognition engine & subscription
    const shapeEngine = new ShapeRecognitionEngine();
    const mockCallback = vi.fn();
    shapeEngine.subscribe(mockCallback);

    // 3. Instantiate and start bridge
    const bridge = new DrawingShapeBridge(mockDrawingEngine, shapeEngine);
    bridge.start();

    expect(registeredCallback).toBeDefined();

    // 4. Simulate a StrokeCompleted event from DrawingEngine
    registeredCallback!({
      type: "StrokeCompleted",
      payload: { strokeId, pointsCount: rawPoints.length },
      timestamp: Date.now()
    });

    // Before setTimeout runs, shape recognition should NOT have been invoked (non-blocking)
    expect(mockCallback).not.toHaveBeenCalled();

    // Wait for the next macro-task tick to trigger processStroke
    await new Promise(resolve => setTimeout(resolve, 5));

    // Confirm recognition triggered and published events
    expect(mockCallback).toHaveBeenCalledTimes(1);
    const event = mockCallback.mock.calls[0][0] as ShapeRecognitionEvent;
    expect(event.type).toBe("RecognitionCompleted");
    if (event.type === "RecognitionCompleted") {
      expect(event.payload.strokeId).toBe(strokeId);
      expect(event.payload.prediction.shapeType).toBe("line");
    }

    // Verify original points array on mock drawing engine are preserved exactly and untouched
    const originalStrokes = mockDrawingEngine.getStrokes();
    expect(originalStrokes[0]!.points[0]!.pressure).toBe(0.5); // Still has original attributes

    // 5. Verify stop cleanup
    bridge.stop();
    expect(registeredCallback).toBeNull();
  });

  it("should ignore strokes with less than minPointsCount configuration", async () => {
    let registeredCallback: ((event: any) => void) | null = null;

    const mockDrawingEngine: IMinimalDrawingEngine = {
      getStrokes: () => [],
      eventBus: {
        subscribe: (_type, callback) => {
          registeredCallback = callback;
          return () => {
            registeredCallback = null;
          };
        }
      }
    };

    const shapeEngine = new ShapeRecognitionEngine();
    const mockCallback = vi.fn();
    shapeEngine.subscribe(mockCallback);

    // Config requiring at least 5 points
    const bridge = new DrawingShapeBridge(mockDrawingEngine, shapeEngine, { minPointsCount: 5 });
    bridge.start();

    // StrokeCompleted with only 3 points
    registeredCallback!({
      type: "StrokeCompleted",
      payload: { strokeId: "short-stroke", pointsCount: 3 },
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 5));

    // Must be ignored entirely
    expect(mockCallback).not.toHaveBeenCalled();
    bridge.stop();
  });
});
