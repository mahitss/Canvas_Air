import { IShapeRecognitionProvider, ProviderMetadata, ProviderHealth } from "./interfaces";
import { Point2D, ShapePrediction } from "../types";
import { ShapeRecognitionPipeline } from "../pipeline";
import { ShapeEngineConfig, DEFAULT_SHAPE_CONFIG } from "../config";

/**
 * Default implementation of ShapeRecognitionProvider.
 * Wraps the hybrid rule-based and Dollar ($1) template recognizer pipeline.
 */
export class DefaultShapeRecognitionProvider implements IShapeRecognitionProvider {
  public readonly metadata: ProviderMetadata = {
    id: "default-pipeline",
    name: "Default Pipeline Recognizer",
    version: "1.0.0",
    description: "Hybrid rule-based and Dollar ($1) template shape recognition engine."
  };

  private readonly pipeline: ShapeRecognitionPipeline;
  private isHealthy = true;

  constructor(config: ShapeEngineConfig = DEFAULT_SHAPE_CONFIG) {
    this.pipeline = new ShapeRecognitionPipeline(config);
  }

  /**
   * Classifies a stroke coordinate sequence using the template/rules pipeline.
   */
  public classify(points: Point2D[]): ShapePrediction {
    if (!this.isHealthy) {
      return {
        shapeType: "unknown",
        confidence: 0,
        boundingBox: { x: 0, y: 0, width: 0, height: 0 },
        corners: [],
        vectorData: null,
        recognitionTimeMs: 0,
        recognitionSource: "rules"
      };
    }
    return this.pipeline.recognize(points);
  }

  /**
   * Returns current provider health.
   */
  public getHealth(): ProviderHealth {
    return {
      status: this.isHealthy ? "healthy" : "unhealthy",
      details: this.isHealthy ? "Pipeline functioning normally." : "Pipeline has been disabled or encountered critical errors.",
      lastChecked: Date.now()
    };
  }

  /**
   * Sets the health state of the provider for testing / status reporting.
   */
  public setHealthy(healthy: boolean): void {
    this.isHealthy = healthy;
  }
}
