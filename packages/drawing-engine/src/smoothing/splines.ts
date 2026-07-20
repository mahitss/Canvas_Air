import { DrawingPoint } from "../types";
import { PointPool } from "../utils/pool";

export class CatmullRomSmoother {
  private static pool = new PointPool(1000);

  /**
   * Calculates a single interpolated point between P1 and P2 using P0 and P3 as guides.
   */
  public static interpolate(
    p0: DrawingPoint,
    p1: DrawingPoint,
    p2: DrawingPoint,
    p3: DrawingPoint,
    t: number,
    tension: number = 0.5
  ): DrawingPoint {
    const t2 = t * t;
    const t3 = t2 * t;

    // Catmull-Rom basis functions
    const f1 = -tension * t3 + 2 * tension * t2 - tension * t;
    const f2 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
    const f3 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
    const f4 = tension * t3 - tension * t2;

    const x = f1 * p0.x + f2 * p1.x + f3 * p2.x + f4 * p3.x;
    const y = f1 * p0.y + f2 * p1.y + f3 * p2.y + f4 * p3.y;
    const z = (p0.z !== undefined && p1.z !== undefined && p2.z !== undefined && p3.z !== undefined)
      ? f1 * p0.z + f2 * p1.z + f3 * p2.z + f4 * p3.z
      : undefined;
    const pressure = Math.max(0.0, Math.min(1.0, f1 * p0.pressure + f2 * p1.pressure + f3 * p2.pressure + f4 * p3.pressure));
    const velocityX = f1 * p0.velocityX + f2 * p1.velocityX + f3 * p2.velocityX + f4 * p3.velocityX;
    const velocityY = f1 * p0.velocityY + f2 * p1.velocityY + f3 * p2.velocityY + f4 * p3.velocityY;
    const timestamp = f1 * p0.timestamp + f2 * p1.timestamp + f3 * p2.timestamp + f4 * p3.timestamp;

    return this.pool.acquire(x, y, pressure, velocityX, velocityY, timestamp, z);
  }

  /**
   * Smooths the point sequence using Catmull-Rom spline curves.
   */
  public static smooth(points: DrawingPoint[], tension: number = 0.5, stepsPerSegment: number = 6): DrawingPoint[] {
    if (points.length < 4) {
      return points;
    }

    // Reset pool for the current smoothing operation to reuse point memory
    this.pool.releaseAll();

    const smoothed: DrawingPoint[] = [];
    smoothed.push(points[0]!);

    for (let i = 0; i < points.length - 1; i++) {
      // Determine four control points
      const p0 = i === 0 ? points[0]! : points[i - 1]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const p3 = i === points.length - 2 ? points[i + 1]! : points[i + 2]!;

      for (let step = 1; step <= stepsPerSegment; step++) {
        const t = step / stepsPerSegment;
        smoothed.push(this.interpolate(p0, p1, p2, p3, t, tension));
      }
    }

    return smoothed;
  }
}
