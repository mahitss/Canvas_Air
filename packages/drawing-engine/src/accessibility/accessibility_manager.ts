export interface AccessibilityConfig {
  largeGesturesOnly: boolean;
  reducedPrecision: boolean;
  oneHandedMode: boolean;
  leftHanded: boolean;
  sensitivityMultiplier: number;
}

export class AccessibilityManager {
  private config: AccessibilityConfig;

  constructor(
    config: AccessibilityConfig = {
      largeGesturesOnly: false,
      reducedPrecision: false,
      oneHandedMode: false,
      leftHanded: false,
      sensitivityMultiplier: 1.0
    }
  ) {
    this.config = config;
  }

  /**
   * Applies sensitivity scaling offsets dynamically on hand positions.
   */
  public scalePosition(x: number, y: number): { x: number; y: number } {
    const mult = this.config.sensitivityMultiplier;
    return {
      x: x * mult,
      y: y * mult
    };
  }

  public updateConfig(updates: Partial<AccessibilityConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
  }

  public getConfig(): AccessibilityConfig {
    return this.config;
  }
}
