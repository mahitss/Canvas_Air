import { describe, it, expect, beforeEach } from "vitest";
import { HandLandmarkSmoother } from "../src/smoother";
import { HandPresence } from "../src/types";

describe("Hand Landmark Smoother", () => {
  let smoother: HandLandmarkSmoother;
  let mockHand: HandPresence;

  beforeEach(() => {
    smoother = new HandLandmarkSmoother({
      minCutoff: 1.0,
      beta: 5.0,
      dcutoff: 1.0
    });

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

  it("should output raw coordinates for first frame since filters have no history", () => {
    const smoothed = smoother.smooth(mockHand);
    expect(smoothed.landmarks.wrist.x).toBe(0.5);
  });

  it("should damp high-frequency jitter on stationary hands", () => {
    // Frame 1
    smoother.smooth(mockHand);

    // Frame 2: Jittered x to 0.52 after 33ms (30fps)
    const frame2 = {
      ...mockHand,
      timestamp: 1033,
      landmarks: {
        wrist: { x: 0.52, y: 0.5, z: 0.0 }
      } as any
    };

    const smoothed2 = smoother.smooth(frame2);
    // Should damp coordinate change significantly due to low-speed low cutoff threshold
    expect(smoothed2.landmarks.wrist.x).toBeGreaterThan(0.5);
    expect(smoothed2.landmarks.wrist.x).toBeLessThan(0.51); // Smooth response is < 0.51 (original was 0.52)
  });

  it("should allow fast transitions when hand speed increases", () => {
    // Frame 1
    smoother.smooth(mockHand);

    // Frame 2: Fast jump to x=0.9 after 33ms
    const frame2 = {
      ...mockHand,
      timestamp: 1033,
      landmarks: {
        wrist: { x: 0.9, y: 0.5, z: 0.0 }
      } as any
    };

    const smoothed2 = smoother.smooth(frame2);
    // Should adapt cutoff frequency and follow coordinates quickly to prevent lagging
    expect(smoothed2.landmarks.wrist.x).toBeGreaterThan(0.65);
  });
});
