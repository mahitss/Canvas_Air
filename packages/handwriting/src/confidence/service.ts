import { Stroke2D, OcrPrediction } from "../types";
import { IHandwritingConfidenceService, HandwritingConfidenceMetrics } from "../interfaces";

/**
 * Service evaluating handwriting stroke quality, character classification probabilities,
 * vocabulary certainties, and template ambiguity.
 */
export class HandwritingConfidenceService implements IHandwritingConfidenceService {
  /**
   * Evaluates input strokes and predictions to produce comprehensive confidence metrics.
   */
  public evaluate(
    strokes: Stroke2D[],
    characterPrediction: OcrPrediction,
    wordText?: string,
    isWordValid?: boolean
  ): HandwritingConfidenceMetrics {
    const qualityScore = this.calculateStrokeQuality(strokes);
    const ambiguityLevel = Math.max(0.0, Math.min(1.0, 1.0 - characterPrediction.confidence));

    // Calculate word vocabulary probability factor
    let wordProbability = 1.0;
    if (wordText !== undefined) {
      if (isWordValid === true) {
        wordProbability = 1.0;
      } else if (isWordValid === false) {
        // If word is invalid, adjust probability based on length-relative penalty
        wordProbability = Math.max(0.4, 1.0 - 0.15 * wordText.length);
      }
    }

    // Combined multi-factor confidence rating
    let confidence = (
      0.15 * qualityScore +
      0.55 * characterPrediction.confidence +
      0.30 * wordProbability
    );

    // Apply minor penalty if ambiguity level is extremely high (> 0.7)
    if (ambiguityLevel > 0.7) {
      confidence *= 0.85;
    }

    return {
      confidence: Math.max(0.0, Math.min(1.0, confidence)),
      qualityScore,
      ambiguityLevel
    };
  }

  private calculateStrokeQuality(strokes: Stroke2D[]): number {
    if (strokes.length === 0) return 0.0;

    let totalPoints = 0;
    let sharpTurns = 0;
    const distances: number[] = [];

    for (const stroke of strokes) {
      totalPoints += stroke.length;

      for (let i = 0; i < stroke.length - 1; i++) {
        const p1 = stroke[i]!;
        const p2 = stroke[i + 1]!;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        distances.push(dist);

        // Analyze direction transitions to count sharp angle turns (drawing jitter)
        if (i < stroke.length - 2) {
          const p3 = stroke[i + 2]!;
          const dx1 = p2.x - p1.x;
          const dy1 = p2.y - p1.y;
          const dx2 = p3.x - p2.x;
          const dy2 = p3.y - p2.y;

          const len1 = Math.hypot(dx1, dy1);
          const len2 = Math.hypot(dx2, dy2);

          if (len1 > 1.5 && len2 > 1.5) {
            const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
            // If dot product is strongly negative, it's a sharp, jittery turn
            if (dot < -0.3) {
              sharpTurns++;
            }
          }
        }
      }
    }

    if (totalPoints === 0) return 0.0;

    // Jitter penalty ratio
    const jitterFactor = sharpTurns / totalPoints;

    // Speed variance: standard deviation of points spacings
    let speedVariance = 0.0;
    if (distances.length > 1) {
      const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
      const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDist, 2), 0) / distances.length;
      speedVariance = Math.sqrt(variance);
    }

    // Base quality score starts at 1.0, penalized by jitter and speed variance
    let score = 1.0 - jitterFactor * 2.5 - Math.min(0.25, speedVariance / 40.0);
    return Math.max(0.15, Math.min(1.0, score));
  }
}
