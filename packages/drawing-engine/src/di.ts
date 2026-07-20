/**
 * Dependency Injection Tokens mapping drawing engine interface identifiers.
 */
export const DRAWING_ENGINE_TOKENS = {
  DrawingEngine: Symbol.for("IDrawingEngine"),
  BrushManager: Symbol.for("IBrushManager"),
  LayerManager: Symbol.for("ILayerManager"),
  HistoryCommander: Symbol.for("IHistoryCommander"),
  DrawingEventBus: Symbol.for("IDrawingEventBus"),
  StrokeService: Symbol.for("IStrokeService"),
  SmoothingService: Symbol.for("ISmoothingService")
} as const;
