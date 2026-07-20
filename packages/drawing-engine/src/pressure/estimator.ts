import { DrawingEngineConfig } from "../config";

export class PressureEstimator {
  private config: DrawingEngineConfig;

  constructor(config: DrawingEngineConfig) {
    this.config = config;
  }

  /**
   * Dynamically estimates stroke virtual pressure between 0.0 and 1.0 based on current velocity.
   * Faster movements yield lower pressure (narrower ink line).
   */
  public estimatePressure(velocityX: number, velocityY: number): number {
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    
    // Normal webcam index speeds usually scale from 0.0 to 10.0 in screen coordinates per unit time
    const sensitivity = this.config.pressureSensitivity;
    
    // Formula: pressure decreases as speed increases
    let estimated = 1.0 - (speed * 0.15 * sensitivity);
    
    // Clamp to config minimum bound limits
    const minPressure = this.config.pressureMinimum;
    estimated = Math.max(minPressure, Math.min(1.0, estimated));
    
    return estimated;
  }

  /**
   * Applies custom power curves to map raw pressure values into target stroke dynamics.
   * E.g. exponent = 0.5 (softer response), exponent = 2.0 (harder response).
   */
  public adjustWithCurve(pressure: number, exponent: number = 1.0): number {
    const clamped = Math.max(0.0, Math.min(1.0, pressure));
    return Math.pow(clamped, exponent);
  }
}
