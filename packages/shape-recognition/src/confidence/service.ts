import { IConfidenceService } from "../interfaces";
import { Point2D, ShapePrediction, ConfidenceMetrics } from "../types";

/**
 * Service that calculates complete confidence, quality, and ambiguity metrics.
 */
export class ConfidenceService implements IConfidenceService {
  /**
   * Evaluates the candidate stroke and prediction to produce complete confidence metrics.
   */
  public evaluate(
    points: Point2D[],
    prediction: ShapePrediction,
    history: ShapePrediction[] = []
  ): ConfidenceMetrics {
    if (points.length < 2) {
      return { confidence: 0.0, qualityScore: 0.0, ambiguityLevel: 1.0 };
    }

    const geometricSimilarity = prediction.confidence;
    const strokeQuality = this.evaluateStrokeQuality(points);
    const completeness = this.evaluateCompleteness(points, prediction);
    const consistency = this.evaluateConsistency(points, prediction);
    const historicalStability = this.evaluateHistoricalStability(prediction, history);

    // Weights: 40% geometry similarity, 20% completeness, 15% consistency, 15% stroke quality, 10% history stability
    let confidence = 
      geometricSimilarity * 0.40 +
      completeness * 0.20 +
      consistency * 0.15 +
      strokeQuality * 0.15 +
      historicalStability * 0.10;

    // Quality score captures physical stroke smoothness and closure completeness
    const qualityScore = strokeQuality * 0.60 + completeness * 0.40;

    // Ambiguity level represents inverse of confidence
    const ambiguityLevel = Math.max(0.0, 1.0 - confidence);

    return {
      confidence: Math.min(1.0, Math.max(0.0, confidence)),
      qualityScore: Math.min(1.0, Math.max(0.0, qualityScore)),
      ambiguityLevel: Math.min(1.0, Math.max(0.0, ambiguityLevel))
    };
  }

  /**
   * Evaluates physical stroke quality based on points curvature variations (jitter).
   */
  private evaluateStrokeQuality(points: Point2D[]): number {
    let angleJitter = 0;
    let count = 0;

    for (let i = 1; i < points.length - 1; i++) {
      const p0 = points[i - 1]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;

      const dx1 = p1.x - p0.x;
      const dy1 = p1.y - p0.y;
      const dx2 = p2.x - p1.x;
      const dy2 = p2.y - p1.y;

      const a1 = Math.atan2(dy1, dx1);
      const a2 = Math.atan2(dy2, dx2);
      
      let diff = Math.abs(a2 - a1);
      while (diff > Math.PI) diff -= 2 * Math.PI;
      angleJitter += Math.abs(diff);
      count++;
    }

    const avgJitter = count > 0 ? angleJitter / count : 0.0;
    
    // Penalize large average jitter (PI/3 is high jitter)
    return Math.max(0.0, 1.0 - avgJitter / (Math.PI / 3));
  }

  /**
   * Assesses stroke completeness (endpoints closure for closed paths).
   */
  private evaluateCompleteness(points: Point2D[], prediction: ShapePrediction): number {
    const { shapeType, boundingBox } = prediction;
    
    if (shapeType === "line") {
      return 1.0;
    }

    const isClosed = ["circle", "ellipse", "square", "rectangle", "triangle", "polygon"].includes(shapeType);
    if (isClosed) {
      const startPt = points[0]!;
      const endPt = points[points.length - 1]!;
      const dist = Math.sqrt(
        (endPt.x - startPt.x) * (endPt.x - startPt.x) +
        (endPt.y - startPt.y) * (endPt.y - startPt.y)
      );

      const bboxDiag = Math.sqrt(boundingBox.width * boundingBox.width + boundingBox.height * boundingBox.height);
      if (bboxDiag === 0) return 0.0;

      // Closed endpoints represents higher completeness
      const ratio = dist / bboxDiag;
      return Math.max(0.0, 1.0 - ratio / 0.20);
    }

    return 0.85; // Baseline default for open shapes
  }

  /**
   * Evaluates feature consistency.
   */
  private evaluateConsistency(points: Point2D[], prediction: ShapePrediction): number {
    const { shapeType, boundingBox } = prediction;
    
    // Circles/ellipses centroid radius consistency check
    if (shapeType === "circle" || shapeType === "ellipse") {
      const center = {
        x: boundingBox.x + boundingBox.width / 2.0,
        y: boundingBox.y + boundingBox.height / 2.0
      };

      const distances = points.map(p => {
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        return Math.sqrt(dx * dx + dy * dy);
      });

      const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
      if (avgDist === 0) return 0.0;

      const variance = distances.reduce((a, b) => a + Math.pow(b - avgDist, 2), 0) / distances.length;
      const stdDev = Math.sqrt(variance);
      
      return Math.max(0.0, 1.0 - stdDev / avgDist);
    }

    return 0.80; // Baseline consistency
  }

  /**
   * Evaluates historical stability matching dominances in predictions history queue.
   */
  private evaluateHistoricalStability(
    prediction: ShapePrediction,
    history: ShapePrediction[]
  ): number {
    if (history.length === 0) return 1.0;

    const matchesCount = history.filter(h => h.shapeType === prediction.shapeType).length;
    return matchesCount / history.length;
  }
}
