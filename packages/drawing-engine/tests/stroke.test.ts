import { describe, it, expect, beforeEach } from "vitest";
import { StrokeService } from "../src/stroke/service";
import { DrawingPoint } from "../src/types";

describe("StrokeService", () => {
  let service: StrokeService;

  beforeEach(() => {
    service = new StrokeService({
      minDistanceThreshold: 3.0,
      minTimeThresholdMs: 10.0
    });
  });

  const createPoint = (x: number, y: number, timestamp: number): DrawingPoint => ({
    x,
    y,
    pressure: 0.5,
    velocityX: 0,
    velocityY: 0,
    timestamp
  });

  it("should initialize a new stroke and preserve details", () => {
    const brushConfig = { name: "Pen", color: "#ff0000", width: 4, opacity: 1.0 };
    const pt = createPoint(10, 20, 1000);

    const stroke = service.startStroke("s-1", "layer-1", brushConfig, pt);
    expect(stroke.id).toBe("s-1");
    expect(stroke.layerId).toBe("layer-1");
    expect(stroke.brushName).toBe("Pen");
    expect(stroke.points).toHaveLength(1);
    expect(stroke.points[0]!.x).toBe(10);
    expect(stroke.points[0]!.timestamp).toBe(1000);
  });

  it("should append points and enforce point density configuration thresholds", () => {
    const brushConfig = { name: "Pen", color: "#ff0000", width: 4, opacity: 1.0 };
    service.startStroke("s-1", "layer-1", brushConfig, createPoint(10, 20, 1000));

    // Try adding point that is too close and too quick
    let result = service.addPoint(createPoint(11, 21, 1005));
    expect(result).toBeNull(); // Skipped!

    // Add point that is far enough (distance = 5px)
    result = service.addPoint(createPoint(15, 20, 1005));
    expect(result).not.toBeNull();
    expect(result!.points).toHaveLength(2);

    // Add point that is delayed enough (dt = 12ms)
    result = service.addPoint(createPoint(15.5, 20.5, 1018));
    expect(result).not.toBeNull();
    expect(result!.points).toHaveLength(3);
  });

  it("should handle interrupted strokes and discard them on cancel", () => {
    const brushConfig = { name: "Pen", color: "#ff0000", width: 4, opacity: 1.0 };
    service.startStroke("s-1", "layer-1", brushConfig, createPoint(10, 20, 1000));
    service.addPoint(createPoint(20, 20, 1010));

    expect(service.getActiveStroke()).not.toBeNull();

    service.cancelStroke();
    expect(service.getActiveStroke()).toBeNull();
    expect(service.completeStroke()).toBeNull();
  });

  it("should finalize and return the completed stroke", () => {
    const brushConfig = { name: "Pen", color: "#ff0000", width: 4, opacity: 1.0 };
    service.startStroke("s-1", "layer-1", brushConfig, createPoint(10, 20, 1000));
    service.addPoint(createPoint(20, 20, 1010));

    const completed = service.completeStroke();
    expect(completed).not.toBeNull();
    expect(completed!.points).toHaveLength(2);
    expect(service.getActiveStroke()).toBeNull(); // State reset
  });
});
