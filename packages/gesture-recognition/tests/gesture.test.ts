import { describe, it, expect, beforeEach, vi } from "vitest";
import { GestureProvider, GestureLifecycleTracker, GestureRecognitionEngine } from "../src/service";
import { HandPresence } from "@visioncanvas/hand-tracking";

describe("Gesture Recognition Engine Stubs", () => {
  let provider: GestureProvider;
  let tracker: GestureLifecycleTracker;
  let engine: GestureRecognitionEngine;
  let mockHand: HandPresence;

  beforeEach(() => {
    provider = new GestureProvider();
    tracker = new GestureLifecycleTracker();
    engine = new GestureRecognitionEngine(tracker);
    engine.registerProvider(provider);

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

  it("should process frame hands and register providers successfully", async () => {
    const callbackSpy = vi.fn();
    engine.subscribe(callbackSpy);

    await expect(engine.processHand(mockHand)).resolves.toBeUndefined();
    expect(callbackSpy).not.toHaveBeenCalled(); // Stub returns null detected gesture
  });

  it("should bind and unbind subscribers cleanly", () => {
    const callbackSpy = vi.fn();
    const unsubscribe = engine.subscribe(callbackSpy);

    unsubscribe();
    engine.unsubscribeAll();

    expect(engine["subscribers"].size).toBe(0);
  });
});
