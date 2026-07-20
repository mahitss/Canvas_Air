export interface CursorPosition {
  x: number;
  y: number;
  z: number;
}

export interface CursorConfig {
  smoothingFactor: number;
  accelerationMultiplier: number;
  precisionModeEnabled: boolean;
  edgeSnappingRadius: number;
}

export class VirtualCursor {
  private currentPos: CursorPosition = { x: 0, y: 0, z: 0 };
  private predictedPos: CursorPosition = { x: 0, y: 0, z: 0 };
  private readonly config: CursorConfig;

  constructor(config: CursorConfig = { smoothingFactor: 0.3, accelerationMultiplier: 1.2, precisionModeEnabled: false, edgeSnappingRadius: 15 }) {
    this.config = config;
  }

  /**
   * Tracks target coordinates applying smoothing filters and velocity accelerations.
   */
  public track(rawPos: CursorPosition, lastPos: CursorPosition): CursorPosition {
    let target = { ...rawPos };

    // Apply edge snapping logic
    if (Math.abs(target.x - 1920) < this.config.edgeSnappingRadius) {
      target.x = 1920;
    }
    if (Math.abs(target.y - 1080) < this.config.edgeSnappingRadius) {
      target.y = 1080;
    }

    const factor = this.config.precisionModeEnabled ? 0.1 : this.config.smoothingFactor;
    const accel = this.config.precisionModeEnabled ? 1.0 : this.config.accelerationMultiplier;

    const dx = (target.x - lastPos.x) * accel;
    const dy = (target.y - lastPos.y) * accel;
    const dz = (target.z - lastPos.z) * accel;

    this.currentPos = {
      x: lastPos.x + dx * factor,
      y: lastPos.y + dy * factor,
      z: lastPos.z + dz * factor
    };

    // Linear extrapolation prediction
    this.predictedPos = {
      x: this.currentPos.x + dx * 0.5,
      y: this.currentPos.y + dy * 0.5,
      z: this.currentPos.z + 0.5
    };

    return this.currentPos;
  }

  public getPosition(): CursorPosition {
    return this.currentPos;
  }

  public getPredictedPosition(): CursorPosition {
    return this.predictedPos;
  }

  public enablePrecisionMode(enabled: boolean): void {
    this.config.precisionModeEnabled = enabled;
  }
}
