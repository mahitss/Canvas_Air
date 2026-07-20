import { describe, it, expect, beforeEach, vi } from "vitest";
import { HandTrackingEventBus } from "../src/event-bus";
import { HandPresence } from "../src/types";

describe("Hand Tracking Event Bus", () => {
  let eventBus: HandTrackingEventBus;
  let mockHand: HandPresence;

  beforeEach(() => {
    eventBus = new HandTrackingEventBus();
    mockHand = {
      id: "hand-right-1",
      type: "right",
      confidence: 0.95,
      timestamp: 1000,
      landmarks: {
        wrist: { x: 0.5, y: 0.5, z: 0.0 }
      } as any
    };
  });

  it("should successfully subscribe and publish events", () => {
    const callbackSpy = vi.fn();
    eventBus.subscribe("HandDetected", callbackSpy);

    eventBus.publish({
      type: "HandDetected",
      payload: { hand: mockHand, frameId: "frame-1" }
    });

    expect(callbackSpy).toHaveBeenCalledTimes(1);
    expect(callbackSpy).toHaveBeenCalledWith({
      type: "HandDetected",
      payload: { hand: mockHand, frameId: "frame-1" }
    });
  });

  it("should cancel subscription when unsubscribe callback is called", () => {
    const callbackSpy = vi.fn();
    const unsubscribe = eventBus.subscribe("HandLost", callbackSpy);

    unsubscribe();

    eventBus.publish({
      type: "HandLost",
      payload: { handId: "hand-1", timestamp: 1000 }
    });

    expect(callbackSpy).not.toHaveBeenCalled();
  });

  it("should isolate exceptions thrown by listeners", () => {
    const buggyCallback = vi.fn().mockImplementation(() => {
      throw new Error("Broken listener");
    });
    const healthyCallback = vi.fn();

    eventBus.subscribe("TrackingStarted", buggyCallback);
    eventBus.subscribe("TrackingStarted", healthyCallback);

    eventBus.publish({
      type: "TrackingStarted",
      payload: { timestamp: 1000 }
    });

    expect(buggyCallback).toHaveBeenCalledTimes(1);
    expect(healthyCallback).toHaveBeenCalledTimes(1); // Continues executing despite buggyCallback throwing
  });
});
