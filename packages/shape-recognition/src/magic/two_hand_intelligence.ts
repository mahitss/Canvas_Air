import { Point2D } from "../types";

export interface HandState {
  wrist: Point2D;
  gesture: string;
}

export class TwoHandIntelligence {
  /**
   * Tracks dual coordinates parameters to trigger composite gestures.
   */
  public evaluateTwoHandAction(left: HandState, right: HandState, lastDistance = 0, lastAngle = 0): { action: string; value?: number } | null {
    if (left.gesture === "Circle" && right.gesture === "Circle") {
      return { action: "Two Circles Portal" };
    }

    const dx = right.wrist.x - left.wrist.x;
    const dy = right.wrist.y - left.wrist.y;
    const distance = Math.hypot(dx, dy);

    // Hands apart/together -> Scale
    if (lastDistance > 0 && Math.abs(distance - lastDistance) > 50) {
      return {
        action: "Scale World",
        value: distance / lastDistance
      };
    }

    // Hands rotate -> Rotate World
    const angle = Math.atan2(dy, dx);
    if (lastAngle !== 0 && Math.abs(angle - lastAngle) > 0.1) {
      return {
        action: "Rotate World",
        value: angle - lastAngle
      };
    }

    return null;
  }
}
