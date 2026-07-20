/**
 * Dependency Injection Registry mapping Shape Recognition symbols.
 */
export const SHAPE_RECOGNITION_TOKENS = {
  ShapeRecognitionEngine: Symbol.for("IShapeRecognitionEngine"),
  ShapeClassifier: Symbol.for("IShapeClassifier"),
  SnappingEngine: Symbol.for("ISnappingEngine"),
  VectorEngine: Symbol.for("IVectorEngine"),
  ShapeEventBus: Symbol.for("IShapeRecognitionEventBus")
} as const;
