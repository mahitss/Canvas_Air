export interface Point2D {
  x: number;
  y: number;
  t?: number; // Optional timestamp
}

export interface BoundingBox2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FeatureSet {
  boundingBox: BoundingBox2D;
  aspectRatio: number;
  perimeter: number;
  area: number;
  centroid: Point2D;
  cornerCount: number;
  isClosed: boolean;
}

export type ShapeType =
  | "circle"
  | "ellipse"
  | "square"
  | "rectangle"
  | "triangle"
  | "diamond"
  | "star"
  | "arrow"
  | "line"
  | "polygon"
  | "unknown";


export interface ShapePrediction {
  shapeType: ShapeType;
  confidence: number;
  recognitionTimeMs: number;
  boundingBox: BoundingBox2D;
  corners: Point2D[];
  vectorData: any;
  recognitionSource: "rules" | "dollar" | "ml";
}

export interface SnappingConfig {
  gridSize: number;
  snapDistance: number;
  angleSnapStepDeg: number;
}

export interface GeometryFeatures {
  strokeLength: number;
  curvature: number;
  angles: number[];
  aspectRatio: number;
  boundingBox: BoundingBox2D;
  convexHull: Point2D[];
  centroid: Point2D;
  directionChanges: {
    x: number;
    y: number;
  };
  corners: Point2D[];
}

export interface NormalizedShape {
  shapeType: ShapeType;
  confidence: number;
  center?: Point2D;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  width?: number;
  height?: number;
  rotation?: number; // radians
  vertices?: Point2D[];
  metadata: {
    originalBoundingBox: BoundingBox2D;
    normalizedBoundingBox: BoundingBox2D;
    snappingStrengthApplied: number;
    rotationDegrees: number;
  };
}

export interface ConfidenceMetrics {
  confidence: number;
  qualityScore: number;
  ambiguityLevel: number;
}



