import { describe, it, expect, beforeEach } from "vitest";
import { StaticGestureProvider } from "../src/providers/static";
import { HandPresence } from "@visioncanvas/hand-tracking";

describe("Static Gesture Recognition Provider", () => {
  let provider: StaticGestureProvider;

  beforeEach(() => {
    provider = new StaticGestureProvider({
      pinchThreshold: 0.05,
      extendRatioThreshold: 1.01
    });
  });

  const createMockHand = (
    extendedFingers: {
      thumb?: boolean;
      index?: boolean;
      middle?: boolean;
      ring?: boolean;
      pinky?: boolean;
    },
    tipsClose: boolean = false
  ): HandPresence => {
    const wrist = { x: 0.0, y: 0.0, z: 0.0 };
    const landmarks: any = { wrist };

    const addFinger = (pipName: string, tipName: string, isExtended: boolean, xOffset: number) => {
      landmarks[pipName] = { x: xOffset, y: -0.2, z: 0.0 };
      landmarks[tipName] = isExtended
        ? { x: xOffset, y: -0.25, z: 0.0 }
        : { x: xOffset, y: -0.15, z: 0.0 };
    };

    addFinger("thumb_ip", "thumb_tip", !!extendedFingers.thumb, -0.15);
    addFinger("index_pip", "index_tip", !!extendedFingers.index, -0.05);
    addFinger("middle_pip", "middle_tip", !!extendedFingers.middle, 0.0);
    addFinger("ring_pip", "ring_tip", !!extendedFingers.ring, 0.05);
    addFinger("pinky_pip", "pinky_tip", !!extendedFingers.pinky, 0.1);

    // MCP landmarks for orientation rules
    landmarks.index_mcp = { x: -0.05, y: -0.1, z: 0.0 };

    if (tipsClose) {
      landmarks.thumb_tip = { x: 0.0, y: -0.3, z: 0.0 };
      landmarks.index_tip = { x: 0.01, y: -0.3, z: 0.01 }; // distance = 0.014 < 0.05
    }

    return {
      id: "hand-1",
      type: "right",
      confidence: 0.9,
      timestamp: 1000,
      landmarks
    };
  };

  it("should recognize Open Palm when all fingers are extended", async () => {
    const hand = createMockHand({ thumb: true, index: true, middle: true, ring: true, pinky: true });
    const result = await provider.detect(hand);
    expect(result).not.toBeNull();
    expect(result!.gesture).toBe("Open Palm");
  });

  it("should recognize Closed Fist when all fingers are folded", async () => {
    const hand = createMockHand({ thumb: false, index: false, middle: false, ring: false, pinky: false });
    const result = await provider.detect(hand);
    expect(result).not.toBeNull();
    expect(result!.gesture).toBe("Closed Fist");
  });

  it("should recognize Point when only index is extended", async () => {
    const hand = createMockHand({ index: true });
    const result = await provider.detect(hand);
    expect(result).not.toBeNull();
    expect(result!.gesture).toBe("Point");
  });

  it("should recognize Peace when index and middle are extended", async () => {
    const hand = createMockHand({ index: true, middle: true });
    const result = await provider.detect(hand);
    expect(result).not.toBeNull();
    expect(result!.gesture).toBe("Peace");
  });

  it("should recognize Thumbs Up when only thumb is extended upward", async () => {
    const hand = createMockHand({ thumb: true });
    // In our mock index_finger_mcp has y: -0.1, thumb_tip has y: -0.25 (which is extended upward, y < index_mcp.y)
    const result = await provider.detect(hand);
    expect(result).not.toBeNull();
    expect(result!.gesture).toBe("Thumbs Up");
  });

  it("should recognize Pinch when thumb and index tips are close, other fingers folded", async () => {
    const hand = createMockHand({}, true);
    const result = await provider.detect(hand);
    expect(result).not.toBeNull();
    expect(result!.gesture).toBe("Pinch");
  });

  it("should recognize OK Sign when thumb and index tips touch, other fingers extended", async () => {
    const hand = createMockHand({ middle: true, ring: true, pinky: true }, true);
    const result = await provider.detect(hand);
    expect(result).not.toBeNull();
    expect(result!.gesture).toBe("OK Sign");
  });
});
