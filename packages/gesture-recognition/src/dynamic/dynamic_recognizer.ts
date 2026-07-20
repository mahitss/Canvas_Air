import { HandPresence } from "@visioncanvas/hand-tracking";

export type DynamicGestureType =
  | "Circle"
  | "Square"
  | "Triangle"
  | "Heart"
  | "Spiral"
  | "Swipe Left"
  | "Swipe Right"
  | "Swipe Up"
  | "Swipe Down"
  | "Wave"
  | "Z Motion"
  | "Infinity Symbol";

export interface DynamicGestureResult {
  gesture: DynamicGestureType;
  confidence: number;
  isPartial: boolean;
  predictionConfidence: number;
}

export class DynamicRecognizer {
  /**
   * Tracks wrist coordinates trajectories to match swipe motions.
   */
  public analyzeTrajectory(path: HandPresence[]): DynamicGestureResult | null {
    if (path.length < 5) return null;

    const startWrist = path[0]?.landmarks.wrist || { x: 0, y: 0, z: 0 };
    const endWrist = path[path.length - 1]?.landmarks.wrist || { x: 0, y: 0, z: 0 };

    const dx = endWrist.x - startWrist.x;
    const dy = endWrist.y - startWrist.y;

    if (dx < -150 && Math.abs(dy) < 50) {
      return {
        gesture: "Swipe Left",
        confidence: 0.94,
        isPartial: false,
        predictionConfidence: 0.98
      };
    }

    if (dx > 150 && Math.abs(dy) < 50) {
      return {
        gesture: "Swipe Right",
        confidence: 0.94,
        isPartial: false,
        predictionConfidence: 0.98
      };
    }

    if (path.length >= 8 && path.length < 15) {
      return {
        gesture: "Circle",
        confidence: 0.60,
        isPartial: true,
        predictionConfidence: 0.75
      };
    }

    return null;
  }
}
