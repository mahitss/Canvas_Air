export type EmitterShapeType = "point" | "circle" | "rectangle" | "stroke" | "fingertip";

export type BlendModeType = "source-over" | "screen" | "multiply" | "lighter";

export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  size: number;
  growth: number;
  rotation: number;
  angularVelocity: number;
  color: string;
  opacity: number;
  decay: number;
  lifetime: number;
  blendMode: BlendModeType;
  gravityFactor: number;
  dragFactor: number;
}

export interface EmitterPreset {
  name: string;
  shape: EmitterShapeType;
  spawnRate: number; // Particles per second
  burstCount: number;
  lifetimeRange: [number, number]; // Seconds
  speedRange: [number, number];
  sizeRange: [number, number];
  colorPalette: string[];
  opacityRange: [number, number];
  blendMode: BlendModeType;
  gravity: number;
  drag: number;
  noiseAmplitude: number;
}

export interface VfxEffectInstance {
  id: string;
  name: string;
  x: number;
  y: number;
  progress: number; // 0.0 to 1.0
  isFinished: boolean;
}

export interface ParticleSimulationStats {
  activeParticlesCount: number;
  activeEmittersCount: number;
  simulationTimeMs: number;
  fps: number;
}

