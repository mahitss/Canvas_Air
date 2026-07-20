import { DrawingPoint } from "../types";
import { PointPool } from "../utils/pool";

export class BezierSmoother {
  private static pool = new PointPool(1000);

  /**
   * Generates a quadratic Bezier curve point between P0 and P2 using P1 as the control point.
   */
  public static getQuadraticPoint(p0: DrawingPoint, p1: DrawingPoint, p2: DrawingPoint, t: number): DrawingPoint {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    const mt2t = 2 * mt * t;

    const x = mt2 * p0.x + mt2t * p1.x + t2 * p2.x;
    const y = mt2 * p0.y + mt2t * p1.y + t2 * p2.y;
    const z = (p0.z !== undefined && p1.z !== undefined && p2.z !== undefined)
      ? mt2 * p0.z + mt2t * p1.z + t2 * p2.z
      : undefined;
    const pressure = mt2 * p0.pressure + mt2t * p1.pressure + t2 * p2.pressure;
    const velocityX = mt2 * p0.velocityX + mt2t * p1.velocityX + t2 * p2.velocityX;
    const velocityY = mt2 * p0.velocityY + mt2t * p1.velocityY + t2 * p2.velocityY;
    const timestamp = mt2 * p0.timestamp + mt2t * p1.timestamp + t2 * p2.timestamp;

    return this.pool.acquire(x, y, pressure, velocityX, velocityY, timestamp, z);
  }

  /**
   * Interpolates an entire path coordinates sequence using quadratic Bezier transitions.
   */
  public static smooth(points: DrawingPoint[], stepsPerSegment: number = 4): DrawingPoint[] {
    if (points.length < 3) {
      return points;
    }

    // Reset pool for the current smoothing operation to reuse point memory
    this.pool.releaseAll();

    const smoothed: DrawingPoint[] = [];
    smoothed.push(points[0]!);

    for (let i = 0; i < points.length - 2; i += 2) {
      const p0 = points[i]!;
      const p1 = points[i + 1]!;
      const p2 = points[i + 2]!;

      for (let step = 1; step <= stepsPerSegment; step++) {
        const t = step / stepsPerSegment;
        smoothed.push(this.getQuadraticPoint(p0, p1, p2, t));
      }
    }

    // Append last point if odd count sequence
    if (points.length % 2 === 0) {
      smoothed.push(points[points.length - 1]!);
    }

    return smoothed;
  }
}
