// VisionCanvas AR | Core Stroke Engine Filters (Kalman & One Euro Filtering)

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private lastValue: number | null = null;
  private lastDeriv: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.008, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  reset() {
    this.lastValue = null;
    this.lastDeriv = null;
  }

  filter(value: number, dt = 0.016): number {
    if (this.lastValue === null) {
      this.lastValue = value;
      this.lastDeriv = 0;
      return value;
    }

    const deriv = (value - this.lastValue) / dt;
    const alphaD = this.calculateAlpha(dt, this.dCutoff);
    const filteredDeriv = alphaD * deriv + (1 - alphaD) * (this.lastDeriv ?? 0);
    this.lastDeriv = filteredDeriv;

    const cutoff = this.minCutoff + this.beta * Math.abs(filteredDeriv);
    const alpha = this.calculateAlpha(dt, cutoff);
    const filteredValue = alpha * value + (1 - alpha) * this.lastValue;
    this.lastValue = filteredValue;
    return filteredValue;
  }

  private calculateAlpha(dt: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }
}

export class Kalman2D {
  private x = 0;
  private y = 0;
  private px = 1.0;
  private py = 1.0;
  private q = 0.005; // process noise
  private r = 0.05;  // measurement noise
  private isInitialized = false;

  reset() {
    this.isInitialized = false;
  }

  filter(rawX: number, rawY: number): { x: number; y: number } {
    if (!this.isInitialized) {
      this.x = rawX;
      this.y = rawY;
      this.isInitialized = true;
      return { x: rawX, y: rawY };
    }

    // Prediction
    this.px += this.q;
    this.py += this.q;

    // Measurement Update
    const kx = this.px / (this.px + this.r);
    const ky = this.py / (this.py + this.r);

    this.x += kx * (rawX - this.x);
    this.y += ky * (rawY - this.y);

    this.px *= (1 - kx);
    this.py *= (1 - ky);

    return { x: this.x, y: this.y };
  }
}
