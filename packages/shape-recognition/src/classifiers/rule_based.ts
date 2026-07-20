import { FeatureSet, ShapeType, Point2D } from "../types";

export class RuleBasedClassifier {
  /**
   * Performs geometric rule evaluation on extracted feature parameters.
   */
  public static classify(features: FeatureSet, rawPoints: Point2D[]): { shapeType: ShapeType; confidence: number } {
    const { aspectRatio, perimeter, area, isClosed } = features;

    // 1. Straight Line rule check
    const startPt = rawPoints[0]!;
    const endPt = rawPoints[rawPoints.length - 1]!;
    const directDist = Math.sqrt(
      (endPt.x - startPt.x) * (endPt.x - startPt.x) +
      (endPt.y - startPt.y) * (endPt.y - startPt.y)
    );

    if (perimeter > 0 && directDist / perimeter > 0.96) {
      return { shapeType: "line", confidence: 0.95 };
    }

    // 2. Closed Shape Rules
    if (isClosed) {
      // Circularity: (4 * pi * area) / perimeter^2 (equals 1.0 for perfect circle)
      const circularity = perimeter > 0 ? (4.0 * Math.PI * area) / (perimeter * perimeter) : 0.0;

      // Circle checks - only match near-perfect circles here
      if (circularity > 0.92) {
        if (aspectRatio >= 0.88 && aspectRatio <= 1.12) {
          return { shapeType: "circle", confidence: 0.95 };
        }
      }
    }

    return { shapeType: "unknown", confidence: 0.0 };
  }
}
export * from "../types";
export * from "../config";

