import { Point2D, ShapePrediction, ShapeType } from "./types";
import { DouglasPeuckerSimplifier } from "./geometry/simplifier";
import { FeatureExtractor } from "./features/extractor";
import { DollarClassifier } from "./classifiers/dollar";
import { RuleBasedClassifier } from "./classifiers/rule_based";
import { VectorEngine, VectorObject } from "./vector/engine";
import { SnappingEngine } from "./snapping/snap";
import { ShapeEngineConfig, DEFAULT_SHAPE_CONFIG } from "./config";

export class ShapeRecognitionPipeline {
  private config: ShapeEngineConfig;
  private dollar: DollarClassifier;
  private vectorEngine: VectorEngine;
  private snappingEngine: SnappingEngine;

  constructor(config: ShapeEngineConfig = DEFAULT_SHAPE_CONFIG) {
    this.config = config;
    this.dollar = new DollarClassifier();
    this.vectorEngine = new VectorEngine();
    this.snappingEngine = new SnappingEngine(config.snapping);
  }

  public setConfig(config: ShapeEngineConfig): void {
    this.config = config;
    this.snappingEngine.updateConfig(config.snapping);
  }

  /**
   * Processes a raw sequence of points through simplification, feature extraction, 
   * classifiers, and optional snapping, returning the refined vector object prediction.
   */
  public recognize(rawPoints: Point2D[]): ShapePrediction {
    const startTime = performance.now();

    if (rawPoints.length < 3) {
      return this.createEmptyPrediction(rawPoints, startTime);
    }

    // 1. Simplify raw paths using Douglas-Peucker epsilon configurations
    const simplifiedPoints = DouglasPeuckerSimplifier.simplify(
      rawPoints, 
      this.config.simplifierTolerance
    );

    // 2. Extract bounding box dimensions, aspect ratio, area shoelace values
    const features = FeatureExtractor.extract(simplifiedPoints);
    const bbox = features.boundingBox;

    // Determine corner coordinates
    let corners = DouglasPeuckerSimplifier.simplify(simplifiedPoints, 5.0);

    // Apply snapping to corners if enabled
    if (this.config.snappingEnabled) {
      corners = corners.map(pt => this.snappingEngine.snapPoint(pt));
    }

    let detectedType: ShapeType = "unknown";
    let maxConfidence = 0.0;
    let recognitionSource: "rules" | "dollar" | "ml" = "rules";

    // 3. Evaluate Rule-Based Classifier first (e.g. strict lines and ellipses)
    const rulePrediction = RuleBasedClassifier.classify(features, rawPoints);
    if (rulePrediction.shapeType !== "unknown" && rulePrediction.confidence >= this.config.confidenceThreshold) {
      detectedType = rulePrediction.shapeType;
      maxConfidence = rulePrediction.confidence;
      recognitionSource = "rules";
    } else {
      // 4. Fallback to template matching DollarClassifier ($1)
      const dollarPrediction = this.dollar.classify(rawPoints);
      if (dollarPrediction.shapeType !== "unknown" && dollarPrediction.confidence >= this.config.confidenceThreshold) {
        let type = dollarPrediction.shapeType;
        // Distinguish square from rectangle based on aspect ratio
        if (type === "rectangle") {
          if (features.aspectRatio >= 0.90 && features.aspectRatio <= 1.10) {
            type = "square";
          }
        }
        detectedType = type;
        maxConfidence = dollarPrediction.confidence;
        recognitionSource = "dollar";
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 5. Generate refined mathematical vector objects if confidence matches
    let vectorData: VectorObject | null = null;
    if (detectedType !== "unknown" && this.config.autoCorrectionEnabled) {
      vectorData = this.vectorEngine.generateVector(detectedType, bbox, corners);
    }

    return {
      shapeType: detectedType,
      confidence: maxConfidence,
      recognitionTimeMs: duration,
      boundingBox: bbox,
      corners,
      vectorData,
      recognitionSource
    };
  }

  private createEmptyPrediction(rawPoints: Point2D[], startTime: number): ShapePrediction {
    const bbox = rawPoints.length > 0
      ? FeatureExtractor.getBoundingBox(rawPoints)
      : { x: 0, y: 0, width: 0, height: 0 };

    return {
      shapeType: "unknown",
      confidence: 0.0,
      recognitionTimeMs: performance.now() - startTime,
      boundingBox: bbox,
      corners: [...rawPoints],
      vectorData: null,
      recognitionSource: "rules"
    };
  }
}
