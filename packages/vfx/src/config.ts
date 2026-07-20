export interface VfxEngineConfig {
  maxParticlesLimit: number;
  globalGravityX: number;
  globalGravityY: number;
  globalWindX: number;
  globalWindY: number;
  turbulenceEnabled: boolean;
  performanceTargetFps: number;
  gpuAccelerated: boolean;
}

export const DEFAULT_VFX_CONFIG: VfxEngineConfig = {
  maxParticlesLimit: 5000,
  globalGravityX: 0.0,
  globalGravityY: 98.0, // Pixels/second^2 pointing downwards
  globalWindX: 15.0,     // Gentle breeze pushing particles right
  globalWindY: -5.0,
  turbulenceEnabled: true,
  performanceTargetFps: 60,
  gpuAccelerated: true
};
