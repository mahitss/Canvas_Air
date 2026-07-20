import { describe, it, expect, beforeEach, vi } from "vitest";
import { HandTrackingGestureBridge } from "../src/integration";
import { IHandTrackingEngine, HandPresence, HandTrackingEvent } from "@visioncanvas/hand-tracking";
import { IGestureRecognitionEngine, IMultiHandGestureEngine } from "../src/interfaces";
import { GestureEvent } from "../src/types";

describe("HandTrackingGestureBridge Integration", () => {
  let mockTrackingEngine: IHandTrackingEngine;
  let mockGestureEngine: IGestureRecognitionEngine;
  let mockMultiHandEngine: IMultiHandGestureEngine;
  let trackingCallbacks: ((event: HandTrackingEvent) => void)[] = [];

  beforeEach(() => {
    trackingCallbacks = [];
    mockTrackingEngine = {
      subscribe: vi.fn().mockImplementation((cb) => {
        trackingCallbacks.push(cb);
        return () => {
          trackingCallbacks = trackingCallbacks.filter((c) => c !== cb);
        };
      }),
      processFrame: vi.fn()
    };

    mockGestureEngine = {
      registerProvider: vi.fn(),
      processHand: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockReturnValue(() => {}),
      unsubscribeAll: vi.fn()
    };

    mockMultiHandEngine = {
      processHands: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => {})
    };
  });

  const createHandEvent = (id: string, timestamp: number, frameId: string): HandTrackingEvent => ({
    type: "LandmarksUpdated",
    payload: {
      hand: {
        id,
        type: "right",
        confidence: 0.9,
        timestamp,
        landmarks: {} as any
      },
      frameId
    }
  });

  it("should subscribe to tracking events on creation and clean up on stop", () => {
    const bridge = new HandTrackingGestureBridge(mockTrackingEngine, mockGestureEngine);
    expect(mockTrackingEngine.subscribe).toHaveBeenCalled();

    bridge.stop();
    expect(trackingCallbacks.length).toBe(0);
  });

  it("should preserve exact frame ordering sequentially", async () => {
    new HandTrackingGestureBridge(mockTrackingEngine, mockGestureEngine);

    const callOrder: number[] = [];
    vi.spyOn(mockGestureEngine, "processHand").mockImplementation(async (hand) => {
      callOrder.push(hand.timestamp);
    });

    // Fire events
    trackingCallbacks.forEach((cb) => cb(createHandEvent("hand-1", 100, "f1")));
    trackingCallbacks.forEach((cb) => cb(createHandEvent("hand-1", 200, "f2")));
    trackingCallbacks.forEach((cb) => cb(createHandEvent("hand-1", 300, "f3")));

    // Wait for the asynchronous processing chain to clear
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(callOrder).toEqual([100, 200, 300]);
  });

  it("should drop outdated landmark events", async () => {
    new HandTrackingGestureBridge(mockTrackingEngine, mockGestureEngine);

    trackingCallbacks.forEach((cb) => cb(createHandEvent("hand-1", 500, "f1")));
    // Outdated frame arriving late (timestamp 400 < 500)
    trackingCallbacks.forEach((cb) => cb(createHandEvent("hand-1", 400, "f2")));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockGestureEngine.processHand).toHaveBeenCalledTimes(1);
    expect((mockGestureEngine.processHand as any).mock.calls[0][0].timestamp).toBe(500);
  });

  it("should group hands by frame ID for multi-hand engines and trigger evaluation", async () => {
    new HandTrackingGestureBridge(mockTrackingEngine, mockGestureEngine, mockMultiHandEngine);

    // Emit two hands belonging to the same frame (f1)
    const evLeft = createHandEvent("left-hand", 1000, "f1");
    evLeft.payload.hand.type = "left";
    const evRight = createHandEvent("right-hand", 1000, "f1");

    trackingCallbacks.forEach((cb) => cb(evLeft));
    trackingCallbacks.forEach((cb) => cb(evRight));

    // Wait for queueMicrotask ticks to flush the batch
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockMultiHandEngine.processHands).toHaveBeenCalledTimes(1);
    const handsPassed = (mockMultiHandEngine.processHands as any).mock.calls[0][0] as HandPresence[];
    expect(handsPassed.length).toBe(2);
    expect(handsPassed.map((h) => h.id)).toContain("left-hand");
    expect(handsPassed.map((h) => h.id)).toContain("right-hand");
  });
});
