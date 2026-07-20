import { DrawingPoint } from "../types";

/**
 * Pre-allocated memory pool for DrawingPoint objects to prevent garbage collection churn.
 */
export class PointPool {
  private pool: DrawingPoint[] = [];
  private index = 0;

  constructor(initialSize = 1000) {
    for (let i = 0; i < initialSize; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        pressure: 1.0,
        velocityX: 0,
        velocityY: 0,
        timestamp: 0
      });
    }
  }

  /**
   * Acquires a point object from the pool, reusing an existing instance.
   */
  public acquire(
    x: number,
    y: number,
    pressure: number,
    velocityX: number,
    velocityY: number,
    timestamp: number,
    z?: number
  ): DrawingPoint {
    if (this.index >= this.pool.length) {
      // Dynamically expand pool if exceeded
      this.pool.push({
        x: 0,
        y: 0,
        pressure: 1.0,
        velocityX: 0,
        velocityY: 0,
        timestamp: 0
      });
    }

    const pt = this.pool[this.index]!;
    this.index++;

    pt.x = x;
    pt.y = y;
    pt.pressure = pressure;
    pt.velocityX = velocityX;
    pt.velocityY = velocityY;
    pt.timestamp = timestamp;
    pt.z = z;

    return pt;
  }

  /**
   * Resets the active index, reclaiming all points in the pool without garbage collection.
   */
  public releaseAll(): void {
    this.index = 0;
  }
}
