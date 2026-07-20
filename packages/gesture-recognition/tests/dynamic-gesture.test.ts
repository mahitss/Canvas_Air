import { describe, it, expect, beforeEach } from "vitest";
import { DynamicGestureProvider } from "../src/providers/dynamic";
import { HandPresence } from "@visioncanvas/hand-tracking";

describe("Dynamic Gesture Recognition Provider", () => {
  let provider: DynamicGestureProvider;

  beforeEach(() => {
    provider = new DynamicGestureProvider({
      minHistoryWindow: 5,
      maxHistoryWindow: 20,
      maxHistoryAgeMs: 1000,
      swipeVelocityThreshold: 0.1,
      zoomDistanceThreshold: 0.03,
      rotateAngleThreshold: 0.3,
      circleRadiusVarianceThreshold: 0.3
    });
  });

  const createBaseHand = (timestamp: number): HandPresence => ({
    id: "hand-1",
    type: "right",
    confidence: 0.9,
    timestamp,
    landmarks: {
      wrist: { x: 0, y: 0, z: 0 },
      index_tip: { x: 0, y: 0, z: 0 },
      thumb_tip: { x: 0, y: 0.1, z: 0 }
    } as any
  });

  it("should recognize Swipe Right when index tip moves rapidly to the right", async () => {
    let result: any = null;

    // Simulate 10 frames over 300ms moving along positive X axis
    for (let i = 0; i < 10; i++) {
      const hand = createBaseHand(1000 + i * 30);
      const offset = i * 0.04;
      hand.landmarks.index_tip = { x: offset, y: 0.0, z: 0.0 }; // Total DX = 0.36
      hand.landmarks.thumb_tip = { x: offset, y: 0.1, z: 0.0 }; // Moves together to prevent Zoom delta
      const res = await provider.detect(hand);
      if (res) {
        result = res;
        break;
      }
    }

    expect(result).not.toBeNull();
    expect(result.gesture).toBe("Swipe Right");
  });

  it("should recognize Swipe Left when index tip moves rapidly to the left", async () => {
    let result: any = null;

    for (let i = 0; i < 10; i++) {
      const hand = createBaseHand(1000 + i * 30);
      const offset = 0.4 - i * 0.04;
      hand.landmarks.index_tip = { x: offset, y: 0.0, z: 0.0 }; // Total DX = -0.36
      hand.landmarks.thumb_tip = { x: offset, y: 0.1, z: 0.0 }; // Moves together
      const res = await provider.detect(hand);
      if (res) {
        result = res;
        break;
      }
    }

    expect(result).not.toBeNull();
    expect(result.gesture).toBe("Swipe Left");
  });

  it("should recognize Swipe Up when index tip moves rapidly upward (negative Y in image space)", async () => {
    let result: any = null;

    for (let i = 0; i < 10; i++) {
      const hand = createBaseHand(1000 + i * 30);
      const offset = 0.4 - i * 0.04;
      hand.landmarks.index_tip = { x: 0.0, y: offset, z: 0.0 }; // Total DY = -0.36
      hand.landmarks.thumb_tip = { x: 0.0, y: offset + 0.1, z: 0.0 }; // Moves together
      const res = await provider.detect(hand);
      if (res) {
        result = res;
        break;
      }
    }

    expect(result).not.toBeNull();
    expect(result.gesture).toBe("Swipe Up");
  });

  it("should recognize Swipe Down when index tip moves rapidly downward (positive Y in image space)", async () => {
    let result: any = null;

    for (let i = 0; i < 10; i++) {
      const hand = createBaseHand(1000 + i * 30);
      const offset = i * 0.04;
      hand.landmarks.index_tip = { x: 0.0, y: offset, z: 0.0 }; // Total DY = 0.36
      hand.landmarks.thumb_tip = { x: 0.0, y: offset + 0.1, z: 0.0 }; // Moves together
      const res = await provider.detect(hand);
      if (res) {
        result = res;
        break;
      }
    }

    expect(result).not.toBeNull();
    expect(result.gesture).toBe("Swipe Down");
  });

  it("should recognize Zoom In when distance between tips increases", async () => {
    let result: any = null;

    for (let i = 0; i < 10; i++) {
      const hand = createBaseHand(1000 + i * 30);
      // Increase distance from 0.02 to 0.11
      hand.landmarks.thumb_tip = { x: 0.0, y: 0.0, z: 0.0 };
      hand.landmarks.index_tip = { x: 0.02 + i * 0.01, y: 0.0, z: 0.0 };
      const res = await provider.detect(hand);
      if (res) {
        result = res;
        break;
      }
    }

    expect(result).not.toBeNull();
    expect(result.gesture).toBe("Zoom In");
  });

  it("should recognize Zoom Out when distance between tips decreases", async () => {
    let result: any = null;

    for (let i = 0; i < 10; i++) {
      const hand = createBaseHand(1000 + i * 30);
      // Decrease distance from 0.11 to 0.02
      hand.landmarks.thumb_tip = { x: 0.0, y: 0.0, z: 0.0 };
      hand.landmarks.index_tip = { x: 0.11 - i * 0.01, y: 0.0, z: 0.0 };
      const res = await provider.detect(hand);
      if (res) {
        result = res;
        break;
      }
    }

    expect(result).not.toBeNull();
    expect(result.gesture).toBe("Zoom Out");
  });

  it("should recognize Rotate when thumb-index angle changes monotonically", async () => {
    let result: any = null;

    for (let i = 0; i < 10; i++) {
      const hand = createBaseHand(1000 + i * 30);
      const angle = i * 0.1; // Total delta = 0.9 rad > 0.3 threshold
      hand.landmarks.thumb_tip = { x: 0.0, y: 0.0, z: 0.0 };
      hand.landmarks.index_tip = { x: Math.cos(angle) * 0.05, y: Math.sin(angle) * 0.05, z: 0.0 };
      const res = await provider.detect(hand);
      if (res) {
        result = res;
        break;
      }
    }

    expect(result).not.toBeNull();
    expect(result.gesture).toBe("Rotate");
  });

  it("should recognize Circle when index tip traces a circular trajectory", async () => {
    let result: any = null;

    // Traces circular path
    for (let i = 0; i < 16; i++) {
      const hand = createBaseHand(1000 + i * 30);
      const theta = (i / 15) * 2 * Math.PI; // Full circle
      const ix = 0.5 + Math.cos(theta) * 0.1;
      const iy = 0.5 + Math.sin(theta) * 0.1;
      hand.landmarks.index_tip = {
        x: ix,
        y: iy,
        z: 0.0
      };
      // Keep thumb spaced at constant offset to prevent Zoom trigger
      hand.landmarks.thumb_tip = {
        x: ix,
        y: iy + 0.1,
        z: 0.0
      };
      const res = await provider.detect(hand);
      if (res) {
        result = res;
        break;
      }
    }

    expect(result).not.toBeNull();
    expect(result.gesture).toBe("Circle");
  });
});
