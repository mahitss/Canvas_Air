import { Particle } from "../particle/particle";
import { ParticlePool } from "../particle/pool";
import { EmitterPreset, ParticleConfig } from "../types";

export class ParticleEmitter {
  public id: string;
  public x: number = 0;
  public y: number = 0;
  public isEnabled: boolean = true;

  // Active particles managed by this emitter
  public activeParticles: Particle[] = [];
  
  private preset: EmitterPreset;
  private timeAccumulator: number = 0.0;

  constructor(id: string, preset: EmitterPreset, x: number = 0, y: number = 0) {
    this.id = id;
    this.preset = preset;
    this.x = x;
    this.y = y;
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public getPreset(): EmitterPreset {
    return this.preset;
  }

  public updatePreset(preset: EmitterPreset): void {
    this.preset = preset;
  }

  /**
   * Spawns scheduled continuous particles and updates positions of all active particles.
   */
  public update(dt: number, pool: ParticlePool, gravityY: number, windX: number, _windY: number, spawnRateScale: number = 1.0): void {
    // 1. Process active particles positions updates
    const stillActive: Particle[] = [];
    for (const pt of this.activeParticles) {
      // Calculate external forces: wind and gravity vectors
      pt.ax = windX;
      pt.ay = gravityY * pt.gravityFactor;
      
      // Calculate drag resistance force opposing velocity: Fd = -c * v
      pt.ax -= pt.vx * pt.dragFactor;
      pt.ay -= pt.vy * pt.dragFactor;

      const alive = pt.update(dt);
      if (alive) {
        stillActive.push(pt);
      } else {
        pool.release(pt);
      }
    }
    this.activeParticles = stillActive;

    if (!this.isEnabled) {
      return;
    }

    // 2. Continuous particles spawner schedule
    if (this.preset.spawnRate > 0) {
      this.timeAccumulator += dt;
      const rate = this.preset.spawnRate * spawnRateScale;
      if (rate > 0) {
        const secondsPerParticle = 1.0 / rate;
        while (this.timeAccumulator >= secondsPerParticle) {
          this.timeAccumulator -= secondsPerParticle;
          this.spawnSingle(pool);
        }
      }
    }
  }

  /**
   * Immediately spawns a batch of particles.
   */
  public burst(count: number, pool: ParticlePool): void {
    if (!this.isEnabled) {
      return;
    }
    for (let i = 0; i < count; i++) {
      this.spawnSingle(pool);
    }
  }

  private spawnSingle(pool: ParticlePool): void {
    const coords = this.getSpawnCoordinates();
    
    // Speed random speed range
    const speed = this.randomRange(this.preset.speedRange[0], this.preset.speedRange[1]);
    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // Properties variables
    const size = this.randomRange(this.preset.sizeRange[0], this.preset.sizeRange[1]);
    const lifetime = this.randomRange(this.preset.lifetimeRange[0], this.preset.lifetimeRange[1]);
    const opacity = this.randomRange(this.preset.opacityRange[0], this.preset.opacityRange[1]);
    
    // Pick random color from palette
    const color = this.preset.colorPalette.length > 0 
      ? this.preset.colorPalette[Math.floor(Math.random() * this.preset.colorPalette.length)]! 
      : "#FFFFFF";

    const config: ParticleConfig = {
      x: coords.x,
      y: coords.y,
      vx,
      vy,
      ax: 0,
      ay: 0,
      size,
      growth: -0.2 * size, // gradually shrink over time
      rotation: Math.random() * 360,
      angularVelocity: this.randomRange(-30, 30),
      color,
      opacity,
      decay: opacity / lifetime, // decay opacity to zero exactly at lifetime
      lifetime,
      blendMode: this.preset.blendMode,
      gravityFactor: this.preset.gravity,
      dragFactor: this.preset.drag
    };

    const pt = pool.acquire(config);
    if (pt) {
      this.activeParticles.push(pt);
    }
  }

  private getSpawnCoordinates(): { x: number; y: number } {
    switch (this.preset.shape) {
      case "circle": {
        const radius = Math.random() * 30; // 30px max spawn spread radius
        const radAngle = Math.random() * Math.PI * 2;
        return {
          x: this.x + Math.cos(radAngle) * radius,
          y: this.y + Math.sin(radAngle) * radius
        };
      }
      case "rectangle": {
        const dx = this.randomRange(-40, 40); // 80px rect width spread
        const dy = this.randomRange(-20, 20);
        return {
          x: this.x + dx,
          y: this.y + dy
        };
      }
      case "point":
      default:
        return { x: this.x, y: this.y };
    }
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const pt of this.activeParticles) {
      pt.draw(ctx);
    }
  }

  public clear(pool: ParticlePool): void {
    for (const pt of this.activeParticles) {
      pool.release(pt);
    }
    this.activeParticles = [];
  }
}
