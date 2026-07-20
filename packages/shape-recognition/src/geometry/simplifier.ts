import { Point2D } from "../types";

export class DouglasPeuckerSimplifier {
  /**
   * Simplifies a 2D polyline point sequence using an optimized, in-place Ramer-Douglas-Peucker algorithm.
   */
  public static simplify(points: Point2D[], epsilon: number): Point2D[] {
    if (points.length <= 2) {
      return [...points];
    }

    const keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;

    // Helper step using indices instead of array slicing/copying
    this.simplifyStep(points, 0, points.length - 1, epsilon, keep);

    const result: Point2D[] = [];
    for (let i = 0; i < points.length; i++) {
      if (keep[i]) {
        result.push(points[i]!);
      }
    }
    return result;
  }

  private static simplifyStep(
    points: Point2D[],
    first: number,
    last: number,
    epsilon: number,
    keep: Uint8Array
  ): void {
    if (first + 1 >= last) {
      return;
    }

    let maxSqDistance = 0;
    let maxIndex = 0;
    const startPoint = points[first]!;
    const endPoint = points[last]!;

    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const lineLenSq = dx * dx + dy * dy;

    for (let i = first + 1; i < last; i++) {
      const p = points[i]!;
      let sqDist = 0;

      if (lineLenSq === 0) {
        const xDiff = p.x - startPoint.x;
        const yDiff = p.y - startPoint.y;
        sqDist = xDiff * xDiff + yDiff * yDiff;
      } else {
        // Squared perpendicular distance to avoid Math.sqrt comparisons
        const t = ((p.x - startPoint.x) * dx + (p.y - startPoint.y) * dy) / lineLenSq;
        const clampedT = Math.max(0, Math.min(1, t));
        const projX = startPoint.x + clampedT * dx;
        const projY = startPoint.y + clampedT * dy;
        const xDiff = p.x - projX;
        const yDiff = p.y - projY;
        sqDist = xDiff * xDiff + yDiff * yDiff;
      }

      if (sqDist > maxSqDistance) {
        maxSqDistance = sqDist;
        maxIndex = i;
      }
    }

    if (maxSqDistance > epsilon * epsilon) {
      keep[maxIndex] = 1;
      this.simplifyStep(points, first, maxIndex, epsilon, keep);
      this.simplifyStep(points, maxIndex, last, epsilon, keep);
    }
  }
}
export * from "../types";

