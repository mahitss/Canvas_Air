export interface EffectCreatedPayload {
  effectId: string;
  name: string;
  x: number;
  y: number;
}

export interface EffectUpdatedPayload {
  effectId: string;
  progress: number;
  activeParticlesCount: number;
}

export interface EffectDestroyedPayload {
  effectId: string;
}

export interface ParticleSpawnedPayload {
  particleId: string;
  emitterId: string;
  x: number;
  y: number;
}

export interface ParticleExpiredPayload {
  particleId: string;
  emitterId: string;
}

export interface EffectErrorPayload {
  effectId?: string;
  errorType: string;
  message: string;
}

export type VfxEventType =
  | "EffectCreated"
  | "EffectUpdated"
  | "EffectDestroyed"
  | "ParticleSpawned"
  | "ParticleExpired"
  | "EffectError";

export interface VfxEvent {
  type: VfxEventType;
  payload: any;
  timestamp: number;
}

export interface IVfxEventBus {
  publish(event: VfxEvent): void;
  subscribe(
    type: VfxEventType | "*",
    callback: (event: VfxEvent) => void,
    options?: { replay?: boolean }
  ): () => void;
  clearHistory(): void;
}
