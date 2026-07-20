import { FrameData } from "@visioncanvas/camera-vision";
import { HandPresence, HandTrackingEvent } from "./types";

/**
 * Interface responsible for running landmark detection algorithms on video frames.
 */
export interface IHandDetector {
  detect(frame: FrameData): Promise<HandPresence[]>;
}

/**
 * Interface responsible for temporal hand ID linking across frame progressions.
 */
export interface IHandTracker {
  track(hands: HandPresence[]): HandPresence[];
}

export interface IHandTrackingEngine {
  processFrame(frame: FrameData): Promise<void>;
  subscribe(callback: (event: HandTrackingEvent) => void): () => void;
  unsubscribeAll(): void;
}

/**
 * Interface isolating third-party hand tracking solutions (like MediaPipe) from domain models.
 */
export interface IHandTrackingProvider {
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  processFrame(frame: FrameData): Promise<HandPresence[]>;
  dispose(): Promise<void>;
}

/**
 * Interface responsible for validating structural joint counts and normalizing inputs.
 */
export interface IHandLandmarkExtractor {
  extract(rawResults: any, timestamp: number): HandPresence[];
  validate(presence: HandPresence): boolean;
}

export interface IHandLandmarkSmoother {
  smooth(presence: HandPresence): HandPresence;
  reset(handId: string): void;
}

/**
 * Interface implementing event bus subscriptions and dispatches.
 */
export interface IHandTrackingEventBus {
  publish(event: HandTrackingEvent): void;
  subscribe<T extends HandTrackingEvent["type"]>(
    type: T,
    callback: (event: Extract<HandTrackingEvent, { type: T }>) => void
  ): () => void;
  clear(): void;
}

/**
 * Interface binding captured frame events from Computer Vision Engine to Hand Tracking Engine.
 */
export interface ICameraVisionHandTrackingBridge {
  start(): void;
  stop(): void;
  isActive(): boolean;
}
