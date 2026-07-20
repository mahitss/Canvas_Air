/**
 * Dependency Injection Tokens mapping gesture recognition interface identifiers.
 */
export const GESTURE_RECOGNITION_TOKENS = {
  GestureProvider: Symbol.for("IGestureProvider"),
  GestureLifecycleTracker: Symbol.for("IGestureLifecycleTracker"),
  GestureRecognitionEngine: Symbol.for("IGestureRecognitionEngine"),
  MultiHandGestureEngine: Symbol.for("IMultiHandGestureEngine"),
  CustomGestureFramework: Symbol.for("ICustomGestureFramework"),
  GestureConfidenceService: Symbol.for("IGestureConfidenceService"),
  GestureEventBus: Symbol.for("IGestureEventBus")
} as const;
