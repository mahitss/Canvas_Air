import { describe, it, expect, beforeEach, vi } from "vitest";
import { HandTrackingEngine } from "../src/engine";
import { IHandDetector, IHandTracker } from "../src/interfaces";
import { FrameData } from "@visioncanvas/camera-vision";

describe("Hand Tracking Engine Optimizations", () => {
  let detector: IHandDetector;
  let tracker: IHandTracker;
  let engine: HandTrackingEngine;
  let mockFrame: FrameData;

  beforeEach(() => {
    detector = {
      detect: vi.fn().mockResolvedValue([
        {
          id: "temp",
          type: "right",
          confidence: 0.9,
          timestamp: 1000,
          landmarks: { wrist: { x: 0.5, y: 0.5, z: 0 } } as any
        }
      ])
    };

    tracker = {
      track: vi.fn().mockImplementation((hands) => hands)
    };

    // Instantiate engine with small latency budget of 2ms to trigger adaptive skips easily
    engine = new HandTrackingEngine(detector, tracker, undefined, 2.0);

    mockFrame = {
      id: "frame-1",
      timestamp: 1000,
      width: 640,
      height: 480,
      data: {} as any
    };
  });

  it("should reuse pooled HandPresence instances to minimize garbage collection allocations", async () => {
    const emittedHands: any[] = [];
    engine.subscribe((event) => {
      if (event.type === "LandmarksUpdated") {
        emittedHands.push(event.payload.hand);
      }
    });

    // Push 5 frames to cycle the pool of size 4
    for (let i = 0; i < 5; i++) {
      mockFrame.id = `frame-${i}`;
      await engine.processFrame(mockFrame);
    }

    expect(emittedHands).toHaveLength(5);
    // The references in the pool of size 4 are recycled, so the 1st and 5th items must match
    expect(emittedHands[0]).toBe(emittedHands[4]); // Reused the same object structure!
  });

  it("should trigger adaptive frame skipping when latency exceeds budget limits", async () => {
    // Make detect stub slow to increase average processing latency above budget (2ms)
    vi.mocked(detector.detect).mockImplementation(async () => {
      // Simulate heavy processing latency of 10ms
      await new Promise((resolve) => setTimeout(resolve, 10));
      return [
        {
          id: "temp",
          type: "right",
          confidence: 0.9,
          timestamp: 1000,
          landmarks: { wrist: { x: 0.5, y: 0.5, z: 0 } } as any
        }
      ];
    });

    const callbackSpy = vi.fn();
    engine.subscribe(callbackSpy);

    // Frame 1: Processes and updates latency average above 2ms
    await engine.processFrame({ ...mockFrame, id: "frame-1", timestamp: 1000 });
    expect(callbackSpy).toHaveBeenCalled();
    callbackSpy.mockClear();

    // Frame 2: Skipped due to adaptive latency budget throttle (even frame count)
    await engine.processFrame({ ...mockFrame, id: "frame-2", timestamp: 1033 });
    expect(callbackSpy).not.toHaveBeenCalled(); // Skipped alternate frame!
  });

  it("should skip redundant tracker executions when no hands are detected", async () => {
    vi.mocked(detector.detect).mockResolvedValue([]);

    await engine.processFrame(mockFrame);
    expect(tracker.track).not.toHaveBeenCalled(); // Skipped tracking path
  });
});
