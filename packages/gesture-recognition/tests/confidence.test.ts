import { describe, it, expect, beforeEach } from "vitest";
import { GestureConfidenceService } from "../src/confidence";
import { HandPresence } from "@visioncanvas/hand-tracking";

describe("Gesture Confidence Scoring Service", () => {
  let service: GestureConfidenceService;

  beforeEach(() => {
    service = new GestureConfidenceService();
  });

  const createBaseHand = (timestamp: number, wristX: number, conf: number = 0.9): HandPresence => ({
    id: "hand-1",
    type: "right",
    confidence: conf,
    timestamp,
    landmarks: {
      wrist: { x: wristX, y: 0.0, z: 0.0 },
      index_tip: { x: wristX, y: 0.2, z: 0.0 },
      thumb_tip: { x: wristX + 0.1, y: 0.0, z: 0.0 }
    } as any
  });

  it("should output high confidence, stability, and tracking quality in clean stable conditions", () => {
    const history: HandPresence[] = [];
    let score: any = null;

    // Simulate 5 frames moving smoothly with 30ms increments
    for (let i = 0; i < 5; i++) {
      const hand = createBaseHand(1000 + i * 30, i * 0.01, 0.95);
      history.push(hand);
      score = service.evaluate(hand, history, ["Swipe Right", "Swipe Right", "Swipe Right"]);
    }

    expect(score).not.toBeNull();
    expect(score.confidence).toBeGreaterThan(0.8);
    expect(score.stability).toBeGreaterThan(0.9);
    expect(score.trackingQuality).toBeGreaterThan(0.9);
  });

  it("should deduct landmark quality when key landmarks are missing", () => {
    const hand = createBaseHand(1000, 0.0, 0.9);
    // Delete wrist and index_tip landmarks
    delete (hand.landmarks as any).wrist;
    delete (hand.landmarks as any).index_tip;

    const score = service.evaluate(hand, [hand], ["Point"]);
    expect(score.trackingQuality).toBeLessThan(0.7); // Significantly lower (0.58 < 0.7)
  });

  it("should lower stability when coordinates experience velocity/acceleration noise", () => {
    const history: HandPresence[] = [];
    let score: any = null;

    for (let i = 0; i < 5; i++) {
      // Jitter coordinate updates: 0, 0.1, -0.05, 0.2, 0.0
      const x = i === 1 ? 0.1 : i === 2 ? -0.05 : i === 3 ? 0.2 : 0.0;
      const hand = createBaseHand(1000 + i * 30, x, 0.9);
      history.push(hand);
      score = service.evaluate(hand, history, ["Point"]);
    }

    expect(score.stability).toBeLessThan(0.7);
  });

  it("should reduce trackingQuality and confidence when coordinate teleportation jumps or frame intervals are jittery", () => {
    const history: HandPresence[] = [];
    let score: any = null;

    // Frame 0
    history.push(createBaseHand(1000, 0.0));
    // Frame 1: large interval step (200ms)
    history.push(createBaseHand(1200, 0.01));
    // Frame 2: small step (10ms)
    history.push(createBaseHand(1210, 0.02));
    // Frame 3: large physical coordinate teleport jump (from 0.02 to 0.4)
    const handJump = createBaseHand(1240, 0.4);
    history.push(handJump);

    score = service.evaluate(handJump, history, ["Point"]);
    expect(score.trackingQuality).toBeLessThan(0.85);
  });

  it("should reduce final composite confidence if matching history has low consistency", () => {
    const history: HandPresence[] = [];
    let score: any = null;

    for (let i = 0; i < 5; i++) {
      const hand = createBaseHand(1000 + i * 30, i * 0.01);
      history.push(hand);
    }

    // Pass inconsistent match history (mostly empty strings)
    score = service.evaluate(history[4]!, history, ["", "", "Swipe Right"]);
    expect(score.confidence).toBeLessThan(0.85);
  });
});
