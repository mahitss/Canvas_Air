import { describe, it, expect, beforeEach, vi } from "vitest";
import { MultiHandGestureEngine } from "../src/multi-hand";
import { HandPresence } from "@visioncanvas/hand-tracking";

describe("Multi Hand Gesture Engine", () => {
  let engine: MultiHandGestureEngine;

  beforeEach(() => {
    engine = new MultiHandGestureEngine({
      maxAgeMs: 1000,
      minSamples: 5,
      pinchDistanceThreshold: 0.05,
      expandThreshold: 0.03,
      rotateThreshold: 0.2,
      mirrorVelocityThreshold: 0.1,
      symmetricVelocityThreshold: 0.1
    });
  });

  const createHandPair = (
    timestamp: number,
    leftWristX: number,
    rightWristX: number,
    leftIndexY: number = 0.0,
    leftThumbY: number = 0.1,
    rightIndexY: number = 0.0,
    rightThumbY: number = 0.1,
    leftAngle: number = 0.0
  ): HandPresence[] => {
    const leftHand: HandPresence = {
      id: "left-hand",
      type: "left",
      confidence: 0.9,
      timestamp,
      landmarks: {
        wrist: { x: leftWristX, y: 0.0, z: 0.0 },
        index_tip: { x: leftWristX, y: leftIndexY, z: 0.0 },
        thumb_tip: { x: leftWristX, y: leftThumbY, z: 0.0 }
      } as any
    };

    // Calculate rotation vector directly relative to leftWristX (making the vector angle match leftAngle exactly)
    const rx = leftWristX + Math.cos(leftAngle) * (rightWristX - leftWristX);
    const ry = Math.sin(leftAngle) * (rightWristX - leftWristX);

    const rightHand: HandPresence = {
      id: "right-hand",
      type: "right",
      confidence: 0.9,
      timestamp,
      landmarks: {
        wrist: { x: rx, y: ry, z: 0.0 },
        index_tip: { x: rx, y: rightIndexY, z: 0.0 },
        thumb_tip: { x: rx, y: rightThumbY, z: 0.0 }
      } as any
    };

    return [leftHand, rightHand];
  };

  it("should recognize Two-hand pinch when index/thumb touch on both hands", () => {
    const spy = vi.fn();
    engine.subscribe(spy);

    // Push 5 samples where tips are touching on both hands
    for (let i = 0; i < 5; i++) {
      const hands = createHandPair(1000 + i * 30, -0.2, 0.2, 0.0, 0.01, 0.0, 0.01);
      engine.processHands(hands);
    }

    expect(spy).toHaveBeenCalled();
    const event = spy.mock.calls[0]![0];
    expect(event.type).toBe("MultiHandGestureDetected");
    expect(event.payload.gesture).toBe("Two-hand pinch");
  });

  it("should recognize Expand when wrists distance increases over time", () => {
    const spy = vi.fn();
    engine.subscribe(spy);

    // Increase separation from 0.4 to 0.48 by keeping left hand static and moving right hand right
    for (let i = 0; i < 5; i++) {
      const offset = i * 0.02;
      const hands = createHandPair(1000 + i * 30, -0.2, 0.2 + offset);
      engine.processHands(hands);
    }

    expect(spy).toHaveBeenCalled();
    const event = spy.mock.calls[0]![0];
    expect(event.payload.gesture).toBe("Expand");
  });

  it("should recognize Rotate when the connection angle shifts", () => {
    const spy = vi.fn();
    engine.subscribe(spy);

    for (let i = 0; i < 5; i++) {
      const angle = i * 0.1; // Total shift = 0.4 rad > 0.2 threshold
      const hands = createHandPair(1000 + i * 30, -0.2, 0.2, 0.0, 0.1, 0.0, 0.1, angle);
      engine.processHands(hands);
    }

    expect(spy).toHaveBeenCalled();
    const event = spy.mock.calls[0]![0];
    expect(event.payload.gesture).toBe("Rotate");
  });

  it("should recognize Mirror when hands move horizontally in opposite directions", () => {
    const spy = vi.fn();
    engine.subscribe(spy);

    // Left hand moves left (-x direction), Right hand moves right (+x direction)
    for (let i = 0; i < 5; i++) {
      const offset = i * 0.02;
      const hands = createHandPair(1000 + i * 30, -0.2 - offset, 0.2 + offset);
      engine.processHands(hands);
    }

    expect(spy).toHaveBeenCalled();
    const event = spy.mock.calls[0]![0];
    expect(event.payload.gesture).toBe("Mirror");
  });

  it("should recognize Symmetric gestures when both hands move in the same direction", () => {
    const spy = vi.fn();
    engine.subscribe(spy);

    // Both hands move right (+x direction)
    for (let i = 0; i < 5; i++) {
      const offset = i * 0.02;
      const hands = createHandPair(1000 + i * 30, -0.2 + offset, 0.2 + offset);
      engine.processHands(hands);
    }

    expect(spy).toHaveBeenCalled();
    const event = spy.mock.calls[0]![0];
    expect(event.payload.gesture).toBe("Symmetric gestures");
  });

  it("should clear history when one hand disappears", () => {
    const spy = vi.fn();
    engine.subscribe(spy);

    const hands = createHandPair(1000, -0.2, 0.2);
    engine.processHands(hands);

    // Pass only one hand (right hand disappears)
    engine.processHands([hands[0]!]);

    expect(engine["history"].getLength()).toBe(0); // Cleared!
  });
});
