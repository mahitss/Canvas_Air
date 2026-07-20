import { IShapeRecognitionEngine } from "./interfaces";
import { Point2D, ShapePrediction } from "./types";
import { ShapeRecognitionEvent, IShapeRecognitionEventBus, ShapeRecognitionEventBus } from "./events";
import { ShapeEngineConfig, DEFAULT_SHAPE_CONFIG } from "./config";
import { ShapeRecognitionProviderManager } from "./providers/manager";
import { DefaultShapeRecognitionProvider } from "./providers/default";

/**
 * Clean Architecture implementation of the Shape Recognition Engine.
 */
export class ShapeRecognitionEngine implements IShapeRecognitionEngine {
  private providerManager: ShapeRecognitionProviderManager;
  private eventBus: IShapeRecognitionEventBus;
  private config: ShapeEngineConfig;

  constructor(
    config: ShapeEngineConfig = DEFAULT_SHAPE_CONFIG,
    eventBus?: IShapeRecognitionEventBus
  ) {
    this.config = config;
    this.eventBus = eventBus || new ShapeRecognitionEventBus();
    
    this.providerManager = new ShapeRecognitionProviderManager();
    this.providerManager.registerProvider(new DefaultShapeRecognitionProvider(config));
  }

  /**
   * Retrieves the shape recognition provider manager.
   */
  public getProviderManager(): ShapeRecognitionProviderManager {
    return this.providerManager;
  }

  /**
   * Processes raw stroke point sequence through geometric classifiers, produces vector representations,
   * assigns confidence scores, and publishes RecognitionCompleted / RecognitionFailed events.
   */
  public recognize(rawPoints: Point2D[], strokeId?: string): ShapePrediction {
    const activeStrokeId = strokeId || `stroke-${Math.random().toString(36).substring(2, 9)}`;
    const prediction = this.providerManager.classify(rawPoints);

    const timestamp = Date.now();
    if (prediction.shapeType !== "unknown" && prediction.confidence >= this.config.confidenceThreshold) {
      const event: ShapeRecognitionEvent = {
        type: "RecognitionCompleted",
        payload: { strokeId: activeStrokeId, prediction },
        timestamp
      };
      this.eventBus.publish(event);
    } else {
      const event: ShapeRecognitionEvent = {
        type: "RecognitionFailed",
        payload: {
          strokeId: activeStrokeId,
          reason: `Confidence score (${prediction.confidence.toFixed(2)}) is below the required threshold (${this.config.confidenceThreshold.toFixed(2)}) or shape type is unknown.`
        },
        timestamp
      };
      this.eventBus.publish(event);
    }

    return prediction;
  }

  /**
   * Subscribes callbacks to receive recognition events.
   */
  public subscribe(callback: (event: ShapeRecognitionEvent) => void): () => void {
    return this.eventBus.subscribe("*", callback);
  }
}

