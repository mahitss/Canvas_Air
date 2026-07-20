import { Point2D, BoundingBox2D, FeatureSet } from "../types";
import { DouglasPeuckerSimplifier } from "../geometry/simplifier";

export class FeatureExtractor {
  /**
   * Extracts structural geometric features from an input coordinate sequence.
   */
  public static extract(points: Point2D[]): FeatureSet {
    if (points.length === 0) {
      throw new Error("Cannot extract features from empty point sequence.");
    }

    const bbox = this.getBoundingBox(points);
    const aspect = bbox.height > 0 ? bbox.width / bbox.height : 1.0;
    
    const perimeter = this.getPerimeter(points);
    const area = this.getArea(points);
    const centroid = this.getCentroid(points);
    
    // Evaluate corner counts by counting sharp direction changes in a simplified path
    const simplified = DouglasPeuckerSimplifier.simplify(points, 5.0);
    const cornerCount = Math.max(0, simplified.length - 2); // Exclude first/last nodes

    const closureDistance = this.getDistance(points[0]!, points[points.length - 1]!);
    const bboxDiag = Math.sqrt(bbox.width * bbox.width + bbox.height * bbox.height);
    // Closed shape if ends are close relative to bounding box size
    const isClosed = bboxDiag > 0 && (closureDistance / bboxDiag < 0.18);

    return {
      boundingBox: bbox,
      aspectRatio: aspect,
      perimeter,
      area,
      centroid,
      cornerCount,
      isClosed
    };
  }

  public static getBoundingBox(points: Point2D[]): BoundingBox2D {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pt of points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private static getPerimeter(points: Point2D[]): number {
    let sum = 0;
    for (let i = 0; i < points.length - 1; i++) {
      sum += this.getDistance(points[i]!, points[i + 1]!);
    }
    return sum;
  }

  /**
   * Computes polygon area using the Shoelace (Gauss) formula.
   */
  private static getArea(points: Point2D[]): number {
    let areaSum = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p1 = points[i]!;
      const p2 = points[(i + 1) % n]!;
      areaSum += p1.x * p2.y - p2.x * p1.y;
    }
    return Math.abs(areaSum) / 2.0;
  }

  private static getCentroid(points: Point2D[]): Point2D {
    let sumX = 0;
    let sumY = 0;
    for (const pt of points) {
      sumX += pt.x;
      sumY += pt.y;
    }
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }

  private static getDistance(p1: Point2D, p2: Point2D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
