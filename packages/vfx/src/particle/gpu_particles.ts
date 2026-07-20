export type GpuParticleType =
  | "Sparkles"
  | "Fire"
  | "Smoke"
  | "Dust"
  | "Energy"
  | "Stars"
  | "Water droplets"
  | "Lightning particles";

export interface GpuParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

export class GpuParticleEngine {
  private static readonly maxParticles = 10000;
  private readonly particleBuffer = new Float32Array(GpuParticleEngine.maxParticles * 6); // x, y, vx, vy, size, life
  private activeCount = 0;

  /**
   * Spawns multiple particle instances at coordinate points.
   */
  public spawnParticles(type: GpuParticleType, count: number, origin: { x: number; y: number }): void {
    void type;
    const limit = Math.min(count, GpuParticleEngine.maxParticles - this.activeCount);

    for (let i = 0; i < limit; i++) {
      const idx = (this.activeCount + i) * 6;
      this.particleBuffer[idx + 0] = origin.x; // x
      this.particleBuffer[idx + 1] = origin.y; // y
      this.particleBuffer[idx + 2] = (Math.random() - 0.5) * 50; // vx
      this.particleBuffer[idx + 3] = (Math.random() - 0.5) * 50; // vy
      this.particleBuffer[idx + 4] = Math.random() * 5 + 2; // size
      this.particleBuffer[idx + 5] = 1.0; // life
    }
    this.activeCount += limit;
  }

  public update(dtMs: number): void {
    const decay = dtMs / 1000;
    let writeIdx = 0;

    for (let i = 0; i < this.activeCount; i++) {
      const readIdx = i * 6;
      const life = this.particleBuffer[readIdx + 5]! - decay;

      if (life > 0) {
        const targetIdx = writeIdx * 6;
        this.particleBuffer[targetIdx + 0] = this.particleBuffer[readIdx + 0]! + this.particleBuffer[readIdx + 2]! * decay; // x
        this.particleBuffer[targetIdx + 1] = this.particleBuffer[readIdx + 1]! + this.particleBuffer[readIdx + 3]! * decay; // y
        this.particleBuffer[targetIdx + 2] = this.particleBuffer[readIdx + 2]!; // vx
        this.particleBuffer[targetIdx + 3] = this.particleBuffer[readIdx + 3]!; // vy
        this.particleBuffer[targetIdx + 4] = this.particleBuffer[readIdx + 4]!; // size
        this.particleBuffer[targetIdx + 5] = life;
        writeIdx++;
      }
    }
    this.activeCount = writeIdx;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public getBuffer(): Float32Array {
    return this.particleBuffer.subarray(0, this.activeCount * 6);
  }

  public clear(): void {
    this.activeCount = 0;
  }
}
