import { IHandLandmarkSmoother } from "./interfaces";
import { HandPresence, JointName, HandLandmark } from "./types";

/**
 * 1E (One-Euro) Filter implementation with adaptive cutoff frequency to smooth raw coordinate inputs.
 */
class OneEuroFilter {
  private firstTime = true;
  private xPrev = 0;
  private dxPrev = 0;
  private tPrev = 0;

  constructor(
    private readonly minCutoff: number,
    private readonly beta: number,
    private readonly dcutoff: number
  ) {}

  public filter(x: number, t: number): number {
    if (this.firstTime) {
      this.firstTime = false;
      this.xPrev = x;
      this.tPrev = t;
      return x;
    }

    const dt = (t - this.tPrev) / 1000.0; // Convert ms to seconds
    if (dt <= 0) {
      return this.xPrev;
    }

    const dx = (x - this.xPrev) / dt;
    const alphaD = this.calculateAlpha(dt, this.dcutoff);
    const dxFiltered = alphaD * dx + (1 - alphaD) * this.dxPrev;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxFiltered);
    const alpha = this.calculateAlpha(dt, cutoff);
    const xFiltered = alpha * x + (1 - alpha) * this.xPrev;

    this.xPrev = xFiltered;
    this.dxPrev = dxFiltered;
    this.tPrev = t;

    return xFiltered;
  }

  private calculateAlpha(dt: number, cutoff: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }
}

/**
 * Production-quality Hand Landmark Smoother.
 * Reduces coordinate jitter under low speed while avoiding lagging and overshooting at high speed.
 */
export class HandLandmarkSmoother implements IHandLandmarkSmoother {
  private filtersMap: Map<
    string,
    {
      lastUpdated: number;
      joints: Record<JointName, { x: OneEuroFilter; y: OneEuroFilter; z: OneEuroFilter }>;
    }
  > = new Map();

  constructor(
    private readonly config: { minCutoff: number; beta: number; dcutoff: number } = {
      minCutoff: 1.0,
      beta: 0.007,
      dcutoff: 1.0
    }
  ) {}

  public smooth(presence: HandPresence): HandPresence {
    const handId = presence.id;
    const t = presence.timestamp;
    const now = Date.now();

    // Self-cleaning GC pass to evict aged out filters
    if (this.filtersMap.size > 20) {
      for (const [key, state] of this.filtersMap.entries()) {
        if (now - state.lastUpdated > 5000) {
          this.filtersMap.delete(key);
        }
      }
    }

    let filterState = this.filtersMap.get(handId);
    if (!filterState) {
      const jointsObj = {} as Record<JointName, { x: OneEuroFilter; y: OneEuroFilter; z: OneEuroFilter }>;
      const joints = Object.keys(presence.landmarks) as JointName[];
      joints.forEach((joint) => {
        jointsObj[joint] = {
          x: new OneEuroFilter(this.config.minCutoff, this.config.beta, this.config.dcutoff),
          y: new OneEuroFilter(this.config.minCutoff, this.config.beta, this.config.dcutoff),
          z: new OneEuroFilter(this.config.minCutoff, this.config.beta, this.config.dcutoff)
        };
      });
      filterState = { lastUpdated: now, joints: jointsObj };
      this.filtersMap.set(handId, filterState);
    } else {
      filterState.lastUpdated = now;
    }

    const activeFilters = filterState.joints;
    const smoothedLandmarks: Partial<Record<JointName, HandLandmark>> = {};

    for (const [joint, lm] of Object.entries(presence.landmarks)) {
      const filters = activeFilters[joint as JointName];
      if (filters) {
        smoothedLandmarks[joint as JointName] = {
          x: filters.x.filter(lm.x, t),
          y: filters.y.filter(lm.y, t),
          z: filters.z.filter(lm.z, t)
        };
      } else {
        smoothedLandmarks[joint as JointName] = lm;
      }
    }

    return {
      ...presence,
      landmarks: smoothedLandmarks as Record<JointName, HandLandmark>
    };
  }

  public reset(handId: string): void {
    this.filtersMap.delete(handId);
  }
}
