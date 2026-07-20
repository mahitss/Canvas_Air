import { describe, it, expect, beforeEach } from "vitest";
import { HandLandmarkExtractor } from "../src/extractor";
import { HandPresence } from "../src/types";

describe("Hand Landmark Extractor", () => {
  let extractor: HandLandmarkExtractor;
  let mockRawLandmarks: Array<{ x: number; y: number; z: number }>;

  beforeEach(() => {
    extractor = new HandLandmarkExtractor();

    // Construct 21 valid coordinate points
    mockRawLandmarks = Array.from({ length: 21 }, (_, idx) => ({
      x: 0.1 * idx,
      y: 0.2 * idx,
      z: -0.05 * idx
    }));
  });

  it("should extract valid landmarks from raw MediaPipe payloads", () => {
    const rawPayload = {
      multiHandLandmarks: [mockRawLandmarks],
      multiHandedness: [{ score: 0.95, label: "Left" }]
    };

    const results = extractor.extract(rawPayload, 123456789);
    expect(results).toHaveLength(1);

    const hand = results[0]!;
    expect(hand.id).toBe("hand-0-123456789");
    expect(hand.type).toBe("left");
    expect(hand.confidence).toBe(0.95);
    expect(hand.timestamp).toBe(123456789);

    expect(hand.landmarks.wrist).toEqual({ x: 0, y: 0, z: -0 });
    expect(hand.landmarks.pinky_tip).toEqual({ x: 2.0, y: 4.0, z: -1.0 });
  });

  it("should drop invalid or incomplete hand landmarks during validation", () => {
    // Missing pinky_tip (only 20 landmarks)
    const incompleteLandmarks = mockRawLandmarks.slice(0, 20);

    const rawPayload = {
      multiHandLandmarks: [incompleteLandmarks],
      multiHandedness: [{ score: 0.95, label: "Left" }]
    };

    const results = extractor.extract(rawPayload, 123456789);
    expect(results).toHaveLength(0); // Validation dropped the incomplete hand
  });

  it("should reject coordinate structures with non-finite values", () => {
    const badLandmarks = [...mockRawLandmarks];
    badLandmarks[0] = { x: NaN, y: 0, z: 0 };

    const rawPayload = {
      multiHandLandmarks: [badLandmarks],
      multiHandedness: [{ score: 0.95, label: "Left" }]
    };

    const results = extractor.extract(rawPayload, 123456789);
    expect(results).toHaveLength(0);
  });
});
