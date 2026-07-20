/**
 * Dependency Injection registration tokens for the VFX & Particle Engine components.
 */
export const VFX_TOKENS = {
  ParticleSystem: Symbol.for("IParticleSystem"),
  EffectEmitter: Symbol.for("IEffectEmitter"),
  VfxEffect: Symbol.for("IVfxEffect"),
  EffectManager: Symbol.for("IEffectManager"),
  VfxEventBus: Symbol.for("IVfxEventBus")
} as const;
