import { Point2D, SnappingConfig } from "../types";

export class SnappingEngine {
  private config: SnappingConfig;

  constructor(config: SnappingConfig) {
    this.config = config;
  }

  public updateConfig(config: SnappingConfig): void {
    this.config = config;
  }

  /**
   * Snaps a 2D coordinate point to the nearest grid intersection if it lies within snap distance boundaries.
   */
  public snapPoint(p: Point2D): Point2D {
    const grid = this.config.gridSize;
    const limit = this.config.snapDistance;

    const snappedX = Math.round(p.x / grid) * grid;
    const snappedY = Math.round(p.y / grid) * grid;

    const dx = snappedX - p.x;
    const dy = snappedY - p.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= limit) {
      return {
        x: snappedX,
        y: snappedY,
        ...(p.t !== undefined ? { t: p.t } : {})
      };
    }

    return { ...p };
  }

  /**
   * Snaps a rotation angle in radians to the closest increment step defined in configuration (e.g. 15 degrees).
   */
  public snapAngle(angleRad: number): number {
    const stepDeg = this.config.angleSnapStepDeg;
    
    // Convert radians to degrees
    const deg = (angleRad * 180.0) / Math.PI;
    const snappedDeg = Math.round(deg / stepDeg) * stepDeg;
    
    // Convert degrees back to radians
    return (snappedDeg * Math.PI) / 180.0;
  }
}
export * from "../types";
export * from "../config";
