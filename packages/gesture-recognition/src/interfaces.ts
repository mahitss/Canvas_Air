import { HandPresence } from "@visioncanvas/hand-tracking";
import { GesturePresence, GestureEvent } from "./types";

/**
 * Interface isolating individual gesture model providers (e.g. geometric, deep learning).
 */
export interface IGestureProvider {
  name: string;
  detect(hand: HandPresence): Promise<GesturePresence | null>;
}

/**
 * Interface tracking gesture durations, active state iterations and ending triggers.
 */
export interface IGestureLifecycleTracker {
  track(handId: string, current: GesturePresence | null, timestamp: number): GesturePresence[];
}

/**
 * Core interface orchestrating providers list, coordinating hand landmarks, and dispatching lifecycle events.
 */
export interface IGestureRecognitionEngine {
  registerProvider(provider: IGestureProvider): void;
  processHand(hand: HandPresence): Promise<void>;
  subscribe(callback: (event: GestureEvent) => void): () => void;
  unsubscribeAll(): void;
}

/**
 * Interface orchestrating multi-hand state synchronizations and symmetric gesture events.
 */
export interface IMultiHandGestureEngine {
  processHands(hands: HandPresence[]): void;
  subscribe(callback: (event: GestureEvent) => void): () => void;
  unsubscribeAll(): void;
}

/**
 * Interface orchestrating registering, configuring, and listing custom user gestures.
 */
export interface ICustomGestureFramework {
  registerGesture(gesture: any): void; // CustomGestureDefinition
  removeGesture(name: string): void;
  listGestures(): any[]; // CustomGestureDefinition[]
  configureThresholds(name: string, thresholds: Record<string, number>): void;
  setGestureEnabled(name: string, enabled: boolean): void;
  evaluate(hand: HandPresence, history: HandPresence[]): string[];
}

export interface GestureConfidenceScore {
  confidence: number;
  stability: number;
  trackingQuality: number;
}

/**
 * Interface calculating combined metrics for tracking confidence, stability and signal quality.
 */
export interface IGestureConfidenceService {
  evaluate(
    hand: HandPresence,
    history: HandPresence[],
    gestureMatchHistory: string[]
  ): GestureConfidenceScore;
}

/**
 * Interface isolating strongly-typed event publisher/subscriber bus with replay capability.
 */
export interface IGestureEventBus {
  publish(event: any): void; // GestureBusEvent
  subscribe(
    type: any | "*", // GestureEventType
    callback: (event: any) => void, // GestureBusEvent
    options?: { replay?: boolean }
  ): () => void;
  clearHistory(): void;
  unsubscribeAll(): void;
}
