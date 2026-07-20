import { describe, it, expect, beforeEach } from "vitest";
import { CustomGestureFramework } from "../src/custom-framework";
import { CustomGestureDefinition } from "../src/types";
import { HandPresence } from "@visioncanvas/hand-tracking";

describe("Custom Gesture Framework", () => {
  let framework: CustomGestureFramework;

  beforeEach(() => {
    framework = new CustomGestureFramework();
  });

  const createMockHand = (x: number): HandPresence => ({
    id: "hand-1",
    type: "right",
    confidence: 0.9,
    timestamp: Date.now(),
    landmarks: {
      wrist: { x, y: 0.0, z: 0.0 }
    } as any
  });

  const createDummyGesture = (name: string): CustomGestureDefinition => ({
    name,
    enabled: true,
    metadata: { author: "Vitest", tag: "drawing" },
    thresholds: { distanceLimit: 0.2 },
    match: (hand: HandPresence, history: HandPresence[], thresholds: Record<string, number>) => {
      const wrist = hand.landmarks.wrist;
      return wrist ? wrist.x > thresholds.distanceLimit : false;
    }
  });

  it("should register and list gestures with metadata and thresholds", () => {
    const gesture = createDummyGesture("Wave");
    framework.registerGesture(gesture);

    const list = framework.listGestures();
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe("Wave");
    expect(list[0]!.metadata.author).toBe("Vitest");
    expect(list[0]!.thresholds.distanceLimit).toBe(0.2);
  });

  it("should allow unregistering gestures", () => {
    const gesture = createDummyGesture("Wave");
    framework.registerGesture(gesture);
    expect(framework.listGestures()).toHaveLength(1);

    framework.removeGesture("Wave");
    expect(framework.listGestures()).toHaveLength(0);
  });

  it("should configure thresholds of existing registered gestures", () => {
    const gesture = createDummyGesture("Wave");
    framework.registerGesture(gesture);

    framework.configureThresholds("Wave", { distanceLimit: 0.5 });
    const list = framework.listGestures();
    expect(list[0]!.thresholds.distanceLimit).toBe(0.5);
  });

  it("should support enabling and disabling gestures", () => {
    const gesture = createDummyGesture("Wave");
    framework.registerGesture(gesture);

    framework.setGestureEnabled("Wave", false);
    expect(framework.listGestures()[0]!.enabled).toBe(false);
  });

  it("should evaluate registered gestures and return matched names based on rule conditions", () => {
    const gesture = createDummyGesture("Wave");
    framework.registerGesture(gesture);

    // Hand below threshold (0.1 <= 0.2)
    const handLow = createMockHand(0.1);
    expect(framework.evaluate(handLow, [])).toHaveLength(0);

    // Hand above threshold (0.3 > 0.2)
    const handHigh = createMockHand(0.3);
    const matched = framework.evaluate(handHigh, []);
    expect(matched).toContain("Wave");
  });

  it("should skip evaluation of disabled gestures", () => {
    const gesture = createDummyGesture("Wave");
    framework.registerGesture(gesture);
    framework.setGestureEnabled("Wave", false);

    const hand = createMockHand(0.3);
    expect(framework.evaluate(hand, [])).toHaveLength(0);
  });
});
