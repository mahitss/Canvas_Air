/**
 * State representing a gesture lifecycle transition.
 */
export type GestureState = "started" | "active" | "ended";

/**
 * Representation of a detected gesture instance.
 */
export interface GesturePresence {
  handId: string;
  gesture: string;
  confidence: number;
  state: GestureState;
  timestamp: number;
}

/**
 * Custom Error definitions for Gesture Recognition Engine.
 */
export class GestureError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "GestureError";
  }
}

export class ProviderInitializationError extends GestureError {
  constructor(message: string) {
    super(message, "PROVIDER_INIT_FAILED");
  }
}

export class RecognitionFailedError extends GestureError {
  constructor(message: string) {
    super(message, "RECOGNITION_FAILED");
  }
}

/**
 * Event bus pub/sub events emitted by the Gesture Recognition Engine.
 */
export type GestureEvent =
  | { type: "GestureStarted"; payload: { gesture: GesturePresence } }
  | { type: "GestureActive"; payload: { gesture: GesturePresence } }
  | { type: "GestureEnded"; payload: { handId: string; gesture: string; timestamp: number } }
  | { type: "MultiHandGestureDetected"; payload: { gesture: string; confidence: number; handIds: string[]; timestamp: number } }
  | GestureBusEvent;

export type GestureEventType =
  | "GestureStarted"
  | "GestureUpdated"
  | "GestureCompleted"
  | "GestureCancelled"
  | "GestureFailed";

export interface GestureEventPayload {
  handId: string;
  gesture: string;
  confidence: number;
  timestamp: number;
  metadata?: Record<string, any>;
  error?: string;
}

export interface GestureBusEvent {
  type: GestureEventType;
  payload: GestureEventPayload;
}

/**
 * Definition of a custom gesture registered dynamically.
 */
export interface CustomGestureDefinition {
  name: string;
  enabled: boolean;
  metadata: Record<string, any>;
  thresholds: Record<string, number>;
  match: (
    hand: any, // HandPresence
    history: any[], // HandPresence[]
    thresholds: Record<string, number>
  ) => boolean;
}
