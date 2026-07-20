import { HandPresence } from "@visioncanvas/hand-tracking";

export interface PredictionResult {
  predictedGesture: string;
  confidence: number;
  earlyTriggered: boolean;
  cancelled: boolean;
}

export class GesturePredictionEngine {
  private predictionCancelled = false;

  /**
   * Extrapolates directional wrist sweeps to trigger early event predictions.
   */
  public predictNextGesture(path: HandPresence[]): PredictionResult | null {
    if (path.length < 3) return null;

    const startWrist = path[0]?.landmarks.wrist || { x: 0, y: 0, z: 0 };
    const latestWrist = path[path.length - 1]?.landmarks.wrist || { x: 0, y: 0, z: 0 };

    const dx = latestWrist.x - startWrist.x;

    if (dx > 80 && !this.predictionCancelled) {
      return {
        predictedGesture: "Swipe Right",
        confidence: 0.78,
        earlyTriggered: true,
        cancelled: false
      };
    }

    return null;
  }

  public cancelPrediction(): void {
    this.predictionCancelled = true;
  }

  public reset(): void {
    this.predictionCancelled = false;
  }
}
