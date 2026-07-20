import { Point2D, FeatureSet, ShapePrediction, SnappingConfig, ShapeType, BoundingBox2D, NormalizedShape, ConfidenceMetrics } from "./types";
import { ShapeRecognitionEvent } from "./events";

export interface IShapeClassifier {
  classify(features: FeatureSet, points: Point2D[]): ShapePrediction;
}

export interface IShapeRecognitionEngine {
  recognize(rawPoints: Point2D[], strokeId?: string): ShapePrediction;
  subscribe(callback: (event: ShapeRecognitionEvent) => void): () => void;
}

export interface ISnappingEngine {
  snapPoint(pt: Point2D): Point2D;
  snapAngle(angleRad: number): number;
  updateConfig(config: SnappingConfig): void;
}

export interface IVectorEngine {
  generateVector(shapeType: ShapeType, bbox: BoundingBox2D, corners: Point2D[]): any;
}

export interface IShapeNormalizationService {
  normalize(prediction: ShapePrediction, strength?: number): NormalizedShape;
}

export interface IConfidenceService {
  evaluate(points: Point2D[], prediction: ShapePrediction, history?: ShapePrediction[]): ConfidenceMetrics;
}


