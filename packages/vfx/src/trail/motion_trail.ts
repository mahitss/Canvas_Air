export interface TrailPoint {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface TrailConfig {
  lifetimeMs: number;
  width: number;
  smoothingFactor: number;
}

export class MotionTrailEngine {
  private readonly fingerTrails = new Map<string, TrailPoint[]>();
  private readonly config: TrailConfig;

  constructor(config: TrailConfig = { lifetimeMs: 1000, width: 8, smoothingFactor: 0.2 }) {
    this.config = config;
  }

  /**
   * Adds coordinate points to the trail history.
   */
  public addPoint(trackId: string, point: { x: number; y: number; z: number }): void {
    let list = this.fingerTrails.get(trackId);
    if (!list) {
      list = [];
      this.fingerTrails.set(trackId, list);
    }

    list.push({ ...point, timestamp: Date.now() });
    this.pruneTrail(trackId);
  }

  /**
   * Returns fading coordinate points in the trail history.
   */
  public getTrail(trackId: string): TrailPoint[] {
    this.pruneTrail(trackId);
    const raw = this.fingerTrails.get(trackId) || [];
    if (raw.length < 3) return raw;

    // Apply smoothing interpolation
    const smoothed: TrailPoint[] = [raw[0]!];
    for (let i = 1; i < raw.length - 1; i++) {
      const prev = smoothed[i - 1]!;
      const curr = raw[i]!;
      smoothed.push({
        x: prev.x + (curr.x - prev.x) * this.config.smoothingFactor,
        y: prev.y + (curr.y - prev.y) * this.config.smoothingFactor,
        z: prev.z + (curr.z - prev.z) * this.config.smoothingFactor,
        timestamp: curr.timestamp
      });
    }
    smoothed.push(raw[raw.length - 1]!);
    return smoothed;
  }

  public getTrailsMap(): Map<string, TrailPoint[]> {
    return this.fingerTrails;
  }

  private pruneTrail(trackId: string): void {
    const list = this.fingerTrails.get(trackId);
    if (!list) return;

    const now = Date.now();
    const active = list.filter(p => now - p.timestamp <= this.config.lifetimeMs);
    this.fingerTrails.set(trackId, active);
  }

  public clear(): void {
    this.fingerTrails.clear();
  }
}
