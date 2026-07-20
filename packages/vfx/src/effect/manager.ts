import { IEffectManager, IEffectEmitter, IParticleSystem } from "../interfaces";
import { EmitterPreset, VfxEffectInstance } from "../types";
import { PresetManager } from "../preset/manager";
import { ParticleEmitter } from "../emitter/emitter";
import { ParticlePool } from "../particle/pool";
import { PhysicsSolver } from "../physics/force";

/**
 * Reusable generic ObjectPool inside VFX package to keep it fully self-contained.
 */
export class VfxObjectPool<T> {
  private pool: T[] = [];
  constructor(private readonly creator: () => T, private readonly resetter?: (obj: T) => void) {}
  public acquire(): T {
    const obj = this.pool.pop();
    return obj !== undefined ? obj : this.creator();
  }
  public release(obj: T): void {
    if (this.resetter) {
      this.resetter(obj);
    }
    this.pool.push(obj);
  }
  public clear(): void {
    this.pool = [];
  }
  public get size(): number {
    return this.pool.length;
  }
}

/**
 * Structural Adapter Pattern: Wraps ParticleEmitter to implement the clean IEffectEmitter interface.
 */
export class EffectEmitterWrapper implements IEffectEmitter {
  constructor(
    public readonly emitter: ParticleEmitter,
    private readonly pool: ParticlePool
  ) {}

  public get id(): string {
    return this.emitter.id;
  }

  public get preset(): EmitterPreset {
    return this.emitter.getPreset();
  }

  public get isActive(): boolean {
    return this.emitter.isEnabled;
  }

  public setPosition(x: number, y: number): void {
    this.emitter.setPosition(x, y);
  }

  public start(): void {
    this.emitter.isEnabled = true;
  }

  public stop(): void {
    this.emitter.isEnabled = false;
  }

  public emitBurst(count?: number): void {
    this.emitter.burst(count ?? 10, this.pool);
  }

  public update(_dt: number, _particleSystem: IParticleSystem): void {
    // Kinematic updates are orchestrated in the manager loop
  }
}

/**
 * Clean Architecture implementation of the Visual Effects Coordinator (EffectManager).
 */
export class EffectManager implements IEffectManager {
  private isPaused: boolean = false;
  private isGloballyEnabled: boolean = true;

  // Active emitters running in simulation
  private activeEmitters: ParticleEmitter[] = [];

  // Active custom effects list
  private activeEffects: VfxEffectInstance[] = [];

  // Emitters memory recycling pools grouped by preset name
  private emitterPools = new Map<string, VfxObjectPool<ParticleEmitter>>();

  // Shared particles memory limits
  private particlePool: ParticlePool;

  constructor(
    private readonly presets: PresetManager = new PresetManager(),
    private readonly physics: PhysicsSolver = new PhysicsSolver(),
    maxParticlesLimit: number = 5000
  ) {
    this.particlePool = new ParticlePool(1000, maxParticlesLimit);
  }

  // --- Preset Registrations ---

  public registerPreset(_name: string, preset: EmitterPreset): void {
    this.presets.addPreset(preset);
  }

  public getPreset(name: string): EmitterPreset | null {
    try {
      return this.presets.getPreset(name);
    } catch {
      return null;
    }
  }

  // --- Emitters Coordinations ---

  public createEmitter(presetName: string, x: number, y: number): IEffectEmitter {
    const preset = this.presets.getPreset(presetName);
    
    // Attempt to acquire a recycled emitter from the pool
    let pool = this.emitterPools.get(presetName);
    if (!pool) {
      pool = new VfxObjectPool<ParticleEmitter>(
        () => new ParticleEmitter(`emitter-${presetName}-${Math.random().toString(36).substring(2, 9)}`, preset, x, y),
        (em) => {
          em.clear(this.particlePool);
          em.isEnabled = true;
        }
      );
      this.emitterPools.set(presetName, pool);
    }

    const emitter = pool.acquire();
    emitter.setPosition(x, y);
    emitter.updatePreset(preset);

    this.activeEmitters.push(emitter);
    return new EffectEmitterWrapper(emitter, this.particlePool);
  }

  public removeEmitter(id: string): boolean {
    const idx = this.activeEmitters.findIndex((em) => em.id === id);
    if (idx !== -1) {
      const emitter = this.activeEmitters[idx]!;
      this.activeEmitters.splice(idx, 1);

      // Return emitter back to its matching pool
      const presetName = emitter.getPreset().name;
      const pool = this.emitterPools.get(presetName);
      if (pool) {
        pool.release(emitter);
      } else {
        emitter.clear(this.particlePool);
      }
      return true;
    }
    return false;
  }

  public getActiveEmitters(): IEffectEmitter[] {
    return this.activeEmitters.map(em => new EffectEmitterWrapper(em, this.particlePool));
  }

  // --- Trigger Effect Instance ---

  public triggerEffect(effectName: string, config: { x: number; y: number; count?: number }): VfxEffectInstance {
    const wrapper = this.createEmitter(effectName, config.x, config.y) as EffectEmitterWrapper;
    const burstCount = config.count ?? wrapper.preset.burstCount ?? 10;
    
    // Trigger immediate particle bursts
    wrapper.emitBurst(burstCount);

    // Disable the continuous spawner so this behaves as a one-shot burst effect!
    wrapper.stop();

    const effectInstance: VfxEffectInstance = {
      id: wrapper.id,
      name: effectName,
      x: config.x,
      y: config.y,
      progress: 0.0,
      isFinished: false
    };

    this.activeEffects.push(effectInstance);
    return effectInstance;
  }

  // --- Global State Controls ---

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public enable(): void {
    this.isGloballyEnabled = true;
  }

  public disable(): void {
    this.isGloballyEnabled = false;
  }

  public get isEnabled(): boolean {
    return this.isGloballyEnabled;
  }

  private userLod: "high" | "medium" | "low" = "high";

  public getLod(): "high" | "medium" | "low" {
    return this.userLod;
  }

  public setLod(level: "high" | "medium" | "low"): void {
    this.userLod = level;
  }

  // --- Updates & Kinematics Loops ---

  public update(dt: number): void {
    if (!this.isGloballyEnabled || this.isPaused) {
      return;
    }

    // 1. Calculate active particles count and adjust dynamic LOD level
    let totalParticles = 0;
    for (const em of this.activeEmitters) {
      totalParticles += em.activeParticles.length;
    }

    let activeLod = this.userLod;
    if (totalParticles > 2000) {
      activeLod = "low";
    } else if (totalParticles > 1000) {
      activeLod = "medium";
    }

    // Map active LOD level to spawn rate scale coefficients
    let spawnRateScale = 1.0;
    if (activeLod === "medium") {
      spawnRateScale = 0.5;
    } else if (activeLod === "low") {
      spawnRateScale = 0.25;
    }

    // 2. Process Emitter simulations and particle integration
    const gy = (this.physics as any).gravityY ?? 98.0;
    const wx = (this.physics as any).windX ?? 0.0;
    const wy = (this.physics as any).windY ?? 0.0;

    for (const em of this.activeEmitters) {
      em.update(dt, this.particlePool, gy, wx, wy, spawnRateScale);
      
      // Apply attractor forces and check boundary collisions for all active particles using LOD settings
      for (const pt of em.activeParticles) {
        this.physics.applyForces(pt, dt, activeLod);
        this.physics.resolveCollisions(pt);
      }
    }

    // 2. Resolve progress and clean up finished burst effect instances
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i]!;
      const matchingEmitter = this.activeEmitters.find((em) => em.id === effect.id);

      if (!matchingEmitter || matchingEmitter.activeParticles.length === 0) {
        // All burst particles are dead; finish and recycle
        effect.isFinished = true;
        effect.progress = 1.0;
        
        this.activeEffects.splice(i, 1);
        if (matchingEmitter) {
          this.removeEmitter(matchingEmitter.id);
        }
      } else {
        // Estimate progress by computing percentage of expired particle lifetimes
        let totalProgress = 0;
        for (const pt of matchingEmitter.activeParticles) {
          totalProgress += pt.age / pt.lifetime;
        }
        effect.progress = Math.min(0.99, totalProgress / matchingEmitter.activeParticles.length);
      }
    }
  }

  // --- Drawing Passes ---

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isGloballyEnabled) {
      return;
    }
    for (const em of this.activeEmitters) {
      em.draw(ctx);
    }
  }

  // --- Cleaning ---

  public clear(): void {
    for (const em of this.activeEmitters) {
      em.clear(this.particlePool);
    }
    this.activeEmitters = [];
    this.activeEffects = [];
    this.particlePool.clear();

    for (const pool of this.emitterPools.values()) {
      pool.clear();
    }
  }
}
