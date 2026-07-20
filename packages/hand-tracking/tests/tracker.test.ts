import { describe, it, expect, beforeEach, vi } from "vitest";
import { HandTracker } from "../src/tracker";
import { HandPresence } from "../src/types";

describe("Hand Tracker Service", () => {
  let tracker: HandTracker;
  let mockHand1: HandPresence;
  let mockHand2: HandPresence;

  beforeEach(() => {
    tracker = new HandTracker();

    mockHand1 = {
      id: "temp-1",
      type: "right",
      confidence: 0.9,
      timestamp: Date.now(),
      landmarks: {
        wrist: { x: 0.5, y: 0.5, z: 0.0 }
      } as any
    };

    mockHand2 = {
      id: "temp-2",
      type: "left",
      confidence: 0.85,
      timestamp: Date.now(),
      landmarks: {
        wrist: { x: 0.2, y: 0.2, z: 0.0 }
      } as any
    };
  });

  it("should assign stable sequential IDs to newly detected hands", () => {
    const tracked = tracker.track([mockHand1, mockHand2]);
    expect(tracked).toHaveLength(2);

    const rightHand = tracked.find((h) => h.type === "right")!;
    const leftHand = tracked.find((h) => h.type === "left")!;

    expect(rightHand.id).toBe("hand-right-1");
    expect(leftHand.id).toBe("hand-left-1");
  });

  it("should maintain stable IDs for close coordinates across frames", () => {
    // Frame 1
    const frame1 = tracker.track([mockHand1]);
    expect(frame1[0]?.id).toBe("hand-right-1");

    // Frame 2: Hand moved slightly
    const movedHand = {
      ...mockHand1,
      landmarks: {
        wrist: { x: 0.51, y: 0.49, z: 0.01 }
      } as any
    };

    const frame2 = tracker.track([movedHand]);
    expect(frame2).toHaveLength(1);
    expect(frame2[0]?.id).toBe("hand-right-1");
  });

  it("should assign new ID if the hand moved too far", () => {
    // Frame 1
    const frame1 = tracker.track([mockHand1]);
    expect(frame1[0]?.id).toBe("hand-right-1");

    // Frame 2: Hand moved far away
    const movedFarHand = {
      ...mockHand1,
      landmarks: {
        wrist: { x: 0.8, y: 0.8, z: 0.1 }
      } as any
    };

    const frame2 = tracker.track([movedFarHand]);
    expect(frame2).toHaveLength(1);
    expect(frame2[0]?.id).toBe("hand-right-2");
  });

  it("should age out tracks after occlusion grace period has passed", () => {
    vi.useFakeTimers();

    tracker.track([mockHand1]);

    // Fast-forward past max age threshold (500ms)
    vi.advanceTimersByTime(600);

    const frame2 = tracker.track([mockHand1]);
    expect(frame2[0]?.id).toBe("hand-right-2"); // Aged out, registered as new track

    vi.useRealTimers();
  });
});
