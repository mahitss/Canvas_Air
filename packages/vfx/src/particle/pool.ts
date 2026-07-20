import { Particle } from "./particle";
import { ParticleConfig } from "../types";

export class ParticlePool {
  private pool: Particle[] = [];
  private sizeLimit: number;
  private activeCount: number = 0;

  constructor(initialCapacity: number = 2000, sizeLimit: number = 5000) {
    this.sizeLimit = sizeLimit;
    
    // Warm up pool memory allocations
    for (let i = 0; i < initialCapacity; i++) {
      this.pool.push(new Particle());
    }
  }

  /**
   * Acquires a recycled inactive particle from the pool or allocates a new one if limit allows.
   */
  public acquire(config: ParticleConfig): Particle | null {
    // 1. Attempt to find first inactive particle in pool array
    for (const pt of this.pool) {
      if (!pt.isAlive) {
        pt.initialize(config);
        this.activeCount++;
        return pt;
      }
    }

    // 2. Expand capacity if we haven't crossed size limits
    if (this.pool.length < this.sizeLimit) {
      const newParticle = new Particle();
      newParticle.initialize(config);
      this.pool.push(newParticle);
      this.activeCount++;
      return newParticle;
    }

    // Return null (budget exceeded) to skip spawns under heavy load
    return null;
  }

  /**
   * Recycles the active particle count counter.
   */
  public release(particle: Particle): void {
    if (particle.isAlive) {
      particle.isAlive = false;
      this.activeCount = Math.max(0, this.activeCount - 1);
    }
  }

  public getActiveCount(): number {
    // Audit active counts dynamically to maintain integrity
    let count = 0;
    for (const pt of this.pool) {
      if (pt.isAlive) {
        count++;
      }
    }
    this.activeCount = count;
    return this.activeCount;
  }

  public getCapacity(): number {
    return this.pool.length;
  }

  public clear(): void {
    for (const pt of this.pool) {
      pt.isAlive = false;
    }
    this.activeCount = 0;
  }
}
export * from "./particle";
