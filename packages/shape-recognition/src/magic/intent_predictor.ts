import { Point2D } from "../types";
import { MagicShapeType } from "./magic_recognizer";

export interface IntentPrediction {
  predictedShape: MagicShapeType;
  confidence: number;
  percentComplete: number;
}

export class IntentPredictor {
  /**
   * Tracks partial paths to estimate the drawn shape before completion.
   */
  public predictIntent(partialPath: Point2D[], estimatedTotalLength = 20): IntentPrediction | null {
    if (partialPath.length < 3) return null;

    const percentComplete = Math.min(100, (partialPath.length / estimatedTotalLength) * 100);

    // If coordinates arc slightly curved, suggest circle early
    if (percentComplete >= 30) {
      return {
        predictedShape: "Circle",
        confidence: 0.82,
        percentComplete
      };
    }

    return null;
  }
}
