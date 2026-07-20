/**
 * Dependency Injection Tokens mapping hand tracking interface identifiers.
 */
export const HAND_TRACKING_TOKENS = {
  HandDetector: Symbol.for("IHandDetector"),
  HandTracker: Symbol.for("IHandTracker"),
  HandTrackingEngine: Symbol.for("IHandTrackingEngine"),
  HandTrackingProvider: Symbol.for("IHandTrackingProvider"),
  HandLandmarkExtractor: Symbol.for("IHandLandmarkExtractor"),
  HandLandmarkSmoother: Symbol.for("IHandLandmarkSmoother"),
  HandTrackingEventBus: Symbol.for("IHandTrackingEventBus"),
  CameraVisionHandTrackingBridge: Symbol.for("ICameraVisionHandTrackingBridge")
} as const;
