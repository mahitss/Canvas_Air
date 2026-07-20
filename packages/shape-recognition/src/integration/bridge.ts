import { IShapeRecognitionEngine } from "../interfaces";
import { Point2D } from "../types";

/**
 * Minimal contract representing the drawing engine.
 * Prevents strong compile-time dependency coupling.
 */
export interface IMinimalDrawingEngine {
  getStrokes(): Array<{
    id: string;
    points: Array<{ x: number; y: number }>;
  }>;
  eventBus: {
    subscribe(
      type: string,
      callback: (event: any) => void
    ): () => void;
  };
}

export interface DrawingShapeBridgeConfig {
  minPointsCount?: number; // Minimum number of points required to trigger shape recognition
}

/**
 * Integration Bridge coordinating StrokeCompleted events from the Air Drawing Engine
 * and triggering recognition in the Shape Recognition Engine asynchronously.
 */
export class DrawingShapeBridge {
  private unsubscriber: (() => void) | null = null;
  private readonly config: Required<DrawingShapeBridgeConfig>;

  constructor(
    private readonly drawingEngine: IMinimalDrawingEngine,
    private readonly shapeEngine: IShapeRecognitionEngine,
    config?: DrawingShapeBridgeConfig
  ) {
    this.config = {
      minPointsCount: config?.minPointsCount ?? 3
    };
  }

  /**
   * Starts listening to completed strokes on the drawing engine to trigger shape recognition.
   */
  public start(): void {
    if (this.unsubscriber) {
      return;
    }

    // Subscribe to StrokeCompleted events
    this.unsubscriber = this.drawingEngine.eventBus.subscribe(
      "StrokeCompleted",
      (event: any) => {
        const { strokeId, pointsCount } = event.payload;
        if (pointsCount < this.config.minPointsCount) {
          return;
        }

        // Trigger recognition in next tick to ensure drawing interactions are never blocked
        setTimeout(() => {
          this.processStroke(strokeId);
        }, 0);
      }
    );
  }

  /**
   * Stops listening to drawing engine events.
   */
  public stop(): void {
    if (this.unsubscriber) {
      this.unsubscriber();
      this.unsubscriber = null;
    }
  }

  /**
   * Processes a completed stroke by mapping coordinates and triggering recognition.
   */
  private processStroke(strokeId: string): void {
    const stroke = this.drawingEngine.getStrokes().find(s => s.id === strokeId);
    if (!stroke || !stroke.points || stroke.points.length === 0) {
      return;
    }

    // Map to Point2D[] format while preserving original coordinates completely untouched
    const points2d: Point2D[] = stroke.points.map(pt => ({
      x: pt.x,
      y: pt.y
    }));

    try {
      this.shapeEngine.recognize(points2d, strokeId);
    } catch (err) {
      console.error(`[DrawingShapeBridgeError] Shape recognition execution failed for stroke ${strokeId}:`, err);
    }
  }
}
