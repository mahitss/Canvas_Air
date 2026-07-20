export interface ScalerDirectives {
  maxParticles: number;
  trailComplexity: number;
  effectQuality: "high" | "medium" | "low";
  resolutionScale: number;
  refreshRateHz: number;
}

export class QualityScaler {
  private isIdle = false;
  private isActive = true;

  /**
   * Automatically scales down rendering loads if system load exceeds thresholds.
   */
  public evaluateQualityDirectives(currentFps: number, isLaptopBattery = false): ScalerDirectives {
    if (!this.isActive) {
      // App inactive: drop performance completely to save power
      return { maxParticles: 0, trailComplexity: 0, effectQuality: "low", resolutionScale: 0.25, refreshRateHz: 10 };
    }

    if (this.isIdle) {
      // App idle: drop frame rates and processing to save battery
      return { maxParticles: 10, trailComplexity: 1, effectQuality: "low", resolutionScale: 0.5, refreshRateHz: 30 };
    }

    if (currentFps < 45 || isLaptopBattery) {
      // Lower rendering constraints to recover frame rate budget
      return {
        maxParticles: 500,
        trailComplexity: 2,
        effectQuality: "medium",
        resolutionScale: 0.75,
        refreshRateHz: 60
      };
    }

    // High performance config
    return {
      maxParticles: 5000,
      trailComplexity: 8,
      effectQuality: "high",
      resolutionScale: 1.0,
      refreshRateHz: 120
    };
  }

  public setIdle(idle: boolean): void {
    this.isIdle = idle;
  }

  public setActive(active: boolean): void {
    this.isActive = active;
  }
}
