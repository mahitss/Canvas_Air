import { Point2D, BoundingBox2D, GeometryFeatures } from "../types";
import { DouglasPeuckerSimplifier } from "./simplifier";

/**
 * Service to extract structural geometric features from polyline strokes.
 */
export class GeometryAnalyzer {
  /**
   * Analyzes raw points and extracts comprehensive geometric features.
   */
  public static analyze(points: Point2D[]): GeometryFeatures {
    if (points.length === 0) {
      throw new Error("Cannot analyze geometry of an empty point sequence.");
    }

    const strokeLength = this.getStrokeLength(points);
    const boundingBox = this.getBoundingBox(points);
    const aspectRatio = boundingBox.height > 0 ? boundingBox.width / boundingBox.height : 1.0;
    const centroid = this.getCentroid(points);
    const convexHull = this.getConvexHull(points);
    const { angles, curvature } = this.getAnglesAndCurvature(points);
    const directionChanges = this.getDirectionChanges(points);
    const corners = this.detectCorners(points);

    return {
      strokeLength,
      curvature,
      angles,
      aspectRatio,
      boundingBox,
      convexHull,
      centroid,
      directionChanges,
      corners
    };
  }

  private static getStrokeLength(points: Point2D[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i]!.x - points[i - 1]!.x;
      const dy = points[i]!.y - points[i - 1]!.y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  private static getBoundingBox(points: Point2D[]): BoundingBox2D {
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
      x: minX === Infinity ? 0 : minX,
      y: minY === Infinity ? 0 : minY,
      width: minX === Infinity ? 0 : maxX - minX,
      height: minY === Infinity ? 0 : maxY - minY
    };
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

  /**
   * Andrew's Monotone Chain Convex Hull algorithm O(N log N)
   */
  public static getConvexHull(points: Point2D[]): Point2D[] {
    if (points.length <= 3) {
      return [...points];
    }

    // Sort by x, then y
    const sorted = [...points].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);

    const cross = (o: Point2D, a: Point2D, b: Point2D) => {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    };

    const lower: Point2D[] = [];
    for (const p of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper: Point2D[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i]!;
      while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  private static getAnglesAndCurvature(points: Point2D[]): { angles: number[]; curvature: number } {
    const angles: number[] = [];
    let curvature = 0;

    if (points.length < 3) {
      return { angles, curvature };
    }

    for (let i = 1; i < points.length - 1; i++) {
      const p0 = points[i - 1]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;

      const dx1 = p1.x - p0.x;
      const dy1 = p1.y - p0.y;
      const dx2 = p2.x - p1.x;
      const dy2 = p2.y - p1.y;

      const angle1 = Math.atan2(dy1, dx1);
      const angle2 = Math.atan2(dy2, dx2);

      let diff = angle2 - angle1;
      // Normalize to [-PI, PI]
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;

      angles.push(diff);
      curvature += Math.abs(diff);
    }

    return { angles, curvature };
  }

  private static getDirectionChanges(points: Point2D[]): { x: number; y: number } {
    let xChanges = 0;
    let yChanges = 0;

    if (points.length < 3) {
      return { x: xChanges, y: yChanges };
    }

    let lastDx = 0;
    let lastDy = 0;

    for (let i = 1; i < points.length; i++) {
      const dx = points[i]!.x - points[i - 1]!.x;
      const dy = points[i]!.y - points[i - 1]!.y;

      // Only evaluate if movement is non-trivial
      if (Math.abs(dx) > 0.01) {
        if (lastDx !== 0 && (dx > 0 !== lastDx > 0)) {
          xChanges++;
        }
        lastDx = dx;
      }

      if (Math.abs(dy) > 0.01) {
        if (lastDy !== 0 && (dy > 0 !== lastDy > 0)) {
          yChanges++;
        }
        lastDy = dy;
      }
    }

    return { x: xChanges, y: yChanges };
  }

  private static detectCorners(points: Point2D[]): Point2D[] {
    if (points.length < 3) {
      return [...points];
    }

    // Simplify the path using Douglas-Peucker tolerance of 5.0
    return DouglasPeuckerSimplifier.simplify(points, 5.0);
  }
}
