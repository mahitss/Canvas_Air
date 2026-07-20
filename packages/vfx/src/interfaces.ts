import { EmitterPreset, VfxEffectInstance, ParticleSimulationStats } from "./types";

/**
 * Interface representing a particle simulation system.
 */
export interface IParticleSystem {
  initialize(maxParticles?: number): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  getStats(): ParticleSimulationStats;
  clear(): void;
}

/**
 * Interface representing a particle source emitter.
 */
export interface IEffectEmitter {
  id: string;
  preset: EmitterPreset;
  isActive: boolean;
  setPosition(x: number, y: number): void;
  start(): void;
  stop(): void;
  emitBurst(count?: number): void;
  update(dt: number, particleSystem: IParticleSystem): void;
}

/**
 * Interface representing a registered visual effect.
 */
export interface IVfxEffect {
  name: string;
  initialize(canvas: HTMLCanvasElement): void;
  resize(width: number, height: number): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  destroy(): void;
}

/**
 * Interface representing the visual effects coordinator/manager.
 */
export interface IEffectManager {
  registerPreset(name: string, preset: EmitterPreset): void;
  getPreset(name: string): EmitterPreset | null;
  createEmitter(presetName: string, x: number, y: number): IEffectEmitter;
  removeEmitter(id: string): boolean;
  getActiveEmitters(): IEffectEmitter[];
  
  triggerEffect(effectName: string, config: any): VfxEffectInstance;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  clear(): void;
}

