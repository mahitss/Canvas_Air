import { DrawingPoint } from "../types";
import { PointPool } from "../utils/pool";

export class ChaikinSmoother {
  private static pool = new PointPool(1500);

  /**
   * Applies Chaikin's corner-cutting algorithm to smooth path coordinate sequences.
   */
  public static smooth(points: DrawingPoint[], iterations: number = 2): DrawingPoint[] {
    if (points.length < 3 || iterations <= 0) {
      return points;
    }

    // Reset pool for the current smoothing operations
    this.pool.releaseAll();

    let current = [...points];

    for (let iter = 0; iter < iterations; iter++) {
      const next: DrawingPoint[] = [];
      
      // Preserve first endpoint coordinate exactly
      next.push(current[0]!);

      for (let i = 0; i < current.length - 1; i++) {
        const p0 = current[i]!;
        const p1 = current[i + 1]!;

        const qX = 0.75 * p0.x + 0.25 * p1.x;
        const qY = 0.75 * p0.y + 0.25 * p1.y;
        const qZ = (p0.z !== undefined && p1.z !== undefined) ? 0.75 * p0.z + 0.25 * p1.z : undefined;
        const qPressure = 0.75 * p0.pressure + 0.25 * p1.pressure;
        const qVelocityX = 0.75 * p0.velocityX + 0.25 * p1.velocityX;
        const qVelocityY = 0.75 * p0.velocityY + 0.25 * p1.velocityY;
        const qTimestamp = 0.75 * p0.timestamp + 0.25 * p1.timestamp;

        const q = this.pool.acquire(qX, qY, qPressure, qVelocityX, qVelocityY, qTimestamp, qZ);

        const rX = 0.25 * p0.x + 0.75 * p1.x;
        const rY = 0.25 * p0.y + 0.75 * p1.y;
        const rZ = (p0.z !== undefined && p1.z !== undefined) ? 0.25 * p0.z + 0.75 * p1.z : undefined;
        const rPressure = 0.25 * p0.pressure + 0.75 * p1.pressure;
        const rVelocityX = 0.25 * p0.velocityX + 0.75 * p1.velocityX;
        const rVelocityY = 0.25 * p0.velocityY + 0.75 * p1.velocityY;
        const rTimestamp = 0.25 * p0.timestamp + 0.75 * p1.timestamp;

        const r = this.pool.acquire(rX, rY, rPressure, rVelocityX, rVelocityY, rTimestamp, rZ);

        next.push(q);
        next.push(r);
      }

      // Preserve last endpoint coordinate exactly
      next.push(current[current.length - 1]!);
      current = next;
    }

    return current;
  }
}
