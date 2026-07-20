import { describe, it, expect, beforeEach, vi } from "vitest";
import { HandDetector } from "../src/service";
import { HandTrackingEngine } from "../src/engine";
import { HandTracker } from "../src/tracker";
import { FrameData } from "@visioncanvas/camera-vision";

describe("Hand Tracking Engine Service Stubs", () => {
  let detector: HandDetector;
  let tracker: HandTracker;
  let engine: HandTrackingEngine;
  let mockFrame: FrameData;

  beforeEach(() => {
    detector = new HandDetector();
    tracker = new HandTracker();
    engine = new HandTrackingEngine(detector, tracker);

    mockFrame = {
      id: "frame-1",
      timestamp: Date.now(),
      width: 640,
      height: 480,
      data: {} as any
    };
  });

  it("should instantiate stubs and process frame successfully", async () => {
    const callbackSpy = vi.fn();
    engine.subscribe(callbackSpy);

    await expect(engine.processFrame(mockFrame)).resolves.toBeUndefined();
    expect(callbackSpy).toHaveBeenCalledTimes(1);
    expect(callbackSpy).toHaveBeenCalledWith({
      type: "TrackingStarted",
      payload: { timestamp: mockFrame.timestamp }
    });
  });

  it("should register and deregister subscribers successfully", () => {
    const callbackSpy = vi.fn();
    const unsubscribe = engine.subscribe(callbackSpy);

    unsubscribe();
    engine.unsubscribeAll();
  });
});
