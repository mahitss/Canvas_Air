import { ParticleEmitter } from "./emitter";
import { ParticlePool } from "../particle/pool";
import { PresetManager } from "../preset/manager";
import { VfxEngineConfig, DEFAULT_VFX_CONFIG } from "../config";

export class EmitterSystem {
  private config: VfxEngineConfig;
  private emitters: Map<string, ParticleEmitter> = new Map();
  private pool: ParticlePool;
  private presets: PresetManager;

  constructor(
    config: VfxEngineConfig = DEFAULT_VFX_CONFIG,
    presets: PresetManager = new PresetManager()
  ) {
    this.config = config;
    this.presets = presets;
    
    // Instantiate shared pool for memory consolidation
    this.pool = new ParticlePool(1000, config.maxParticlesLimit);
  }

  public createEmitter(id: string, presetName: string, x: number = 0, y: number = 0): ParticleEmitter {
    if (this.emitters.has(id)) {
      throw new Error(`Emitter with ID '${id}' already exists.`);
    }

    const preset = this.presets.getPreset(presetName);
    const emitter = new ParticleEmitter(id, preset, x, y);
    this.emitters.set(id, emitter);
    
    return emitter;
  }

  public getEmitter(id: string): ParticleEmitter | undefined {
    return this.emitters.get(id);
  }

  public destroyEmitter(id: string): void {
    const emitter = this.emitters.get(id);
    if (emitter) {
      emitter.clear(this.pool);
      this.emitters.delete(id);
    }
  }

  /**
   * Ticks updating positions of all active particles on all emitters, applying physics wind/gravity values.
   */
  public update(dt: number): void {
    const gy = this.config.globalGravityY;
    const wx = this.config.globalWindX;
    const wy = this.config.globalWindY;

    for (const emitter of this.emitters.values()) {
      emitter.update(dt, this.pool, gy, wx, wy);
    }
  }

  /**
   * Draws active particles inside canvas rendering contexts.
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    for (const emitter of this.emitters.values()) {
      emitter.draw(ctx);
    }
  }

  public getStats(): { activeParticles: number; poolCapacity: number; emittersCount: number } {
    let activeParticlesCount = 0;
    for (const emitter of this.emitters.values()) {
      activeParticlesCount += emitter.activeParticles.length;
    }

    return {
      activeParticles: activeParticlesCount,
      poolCapacity: this.pool.getCapacity(),
      emittersCount: this.emitters.size
    };
  }

  public clear(): void {
    for (const emitter of this.emitters.values()) {
      emitter.clear(this.pool);
    }
    this.emitters.clear();
    this.pool.clear();
  }
}
