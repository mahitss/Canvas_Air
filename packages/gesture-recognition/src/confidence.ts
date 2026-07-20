import { HandPresence } from "@visioncanvas/hand-tracking";
import { IGestureConfidenceService, GestureConfidenceScore } from "./interfaces";

/**
 * Service calculating combined metrics for tracking confidence, stability, and signal quality.
 */
export class GestureConfidenceService implements IGestureConfidenceService {
  /**
   * Evaluates the gesture confidence score using landmark quality, motion stability,
   * detection history, and frame consistency.
   */
  public evaluate(
    hand: HandPresence,
    history: HandPresence[],
    gestureMatchHistory: string[]
  ): GestureConfidenceScore {
    // 1. Landmark Quality
    const landmarkQuality = this.calculateLandmarkQuality(hand);

    // 2. Motion Stability & 4. Frame Consistency
    const { stability, consistency } = this.calculateStabilityAndConsistency(history);

    // 3. Detection History
    const historyScore = this.calculateHistoryScore(gestureMatchHistory);

    // Combine tracking quality using landmark quality and time/coordinate consistency
    const trackingQuality = Math.min(1.0, Math.max(0.0, landmarkQuality * 0.7 + consistency * 0.3));

    // Combine composite confidence: higher if landmarks are high, motion is stable, and history is consistent
    const compositeConfidence = Math.min(
      1.0,
      Math.max(0.0, trackingQuality * 0.4 + stability * 0.3 + historyScore * 0.3)
    );

    return {
      confidence: parseFloat(compositeConfidence.toFixed(4)),
      stability: parseFloat(stability.toFixed(4)),
      trackingQuality: parseFloat(trackingQuality.toFixed(4))
    };
  }

  private calculateLandmarkQuality(hand: HandPresence): number {
    let score = hand.confidence;

    // Verify key landmark existence (wrist, tips)
    const required = ["wrist", "index_tip", "thumb_tip"];
    let missingCount = 0;
    for (const key of required) {
      if (!(hand.landmarks as any)[key]) {
        missingCount++;
      }
    }

    // Deduct score for missing key joints
    if (missingCount > 0) {
      score -= missingCount * 0.25;
    }

    return Math.max(0.0, score);
  }

  private calculateStabilityAndConsistency(
    history: HandPresence[]
  ): { stability: number; consistency: number } {
    if (history.length < 2) {
      return { stability: 1.0, consistency: 1.0 };
    }

    let totalVelocityDiff = 0;
    let totalJumps = 0;
    let timeDeltaVariance = 0;

    const velocities: number[] = [];
    const timeDeltas: number[] = [];

    // Calculate frame-to-frame velocity and time intervals
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1]!;
      const curr = history[i]!;

      const dt = (curr.timestamp - prev.timestamp) / 1000;
      if (dt > 0) {
        timeDeltas.push(dt);

        const dx = curr.landmarks.wrist.x - prev.landmarks.wrist.x;
        const dy = curr.landmarks.wrist.y - prev.landmarks.wrist.y;
        const dz = curr.landmarks.wrist.z - prev.landmarks.wrist.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        velocities.push(dist / dt);

        // Track large physical coordinate teleport jumps
        if (dist > 0.15) {
          totalJumps++;
        }
      }
    }

    // Motion Stability: low variance/acceleration in velocity vector magnitudes
    if (velocities.length >= 2) {
      let speedDiffSum = 0;
      for (let i = 1; i < velocities.length; i++) {
        speedDiffSum += Math.abs(velocities[i]! - velocities[i - 1]!);
      }
      const avgAcceleration = speedDiffSum / (velocities.length - 1);
      totalVelocityDiff = avgAcceleration;
    }

    // Time delta consistency (jitter in frame capture intervals)
    if (timeDeltas.length >= 2) {
      const avgDt = timeDeltas.reduce((a, b) => a + b, 0) / timeDeltas.length;
      let varianceSum = 0;
      timeDeltas.forEach((dt) => {
        varianceSum += (dt - avgDt) ** 2;
      });
      timeDeltaVariance = Math.sqrt(varianceSum / timeDeltas.length);
    }

    // Normalize stability: high acceleration/jitter reduces stability [0, 1]
    const stability = Math.max(0.0, 1.0 - Math.min(1.0, totalVelocityDiff / 1.5));

    // Normalize consistency: teleport jumps and frame-rate jitter reduce consistency [0, 1]
    const consistencyScore = Math.max(
      0.0,
      1.0 - (totalJumps * 0.3 + Math.min(1.0, timeDeltaVariance / 0.05) * 0.4)
    );

    return {
      stability,
      consistency: consistencyScore
    };
  }

  private calculateHistoryScore(gestureMatchHistory: string[]): number {
    if (gestureMatchHistory.length === 0) {
      return 0.5; // Neutral baseline
    }

    // Percentage of non-empty matched gesture strings in history window
    const matchesCount = gestureMatchHistory.filter((g) => g && g !== "").length;
    return matchesCount / gestureMatchHistory.length;
  }
}
