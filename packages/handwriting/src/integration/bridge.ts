import { IHandwritingEngine } from "../interfaces";
import { Stroke2D } from "../types";

/**
 * Minimal decoupled contract representing the drawing engine.
 * Decouples packages at compile-time to maintain clean dependency injection limits.
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

export interface DrawingHandwritingBridgeConfig {
  debounceMs?: number;      // Debounce period to wait before running heavy OCR processes
  minPointsCount?: number;  // Minimum stroke length to trigger processing
}

/**
 * Integration Bridge coordinating StrokeCompleted events from the Air Drawing Engine
 * and triggering recognition in the Handwriting Recognition Engine asynchronously.
 */
export class DrawingHandwritingBridge {
  private unsubscriber: (() => void) | null = null;
  private debounceTimer: any = null;
  private readonly config: Required<DrawingHandwritingBridgeConfig>;

  constructor(
    private readonly drawingEngine: IMinimalDrawingEngine,
    private readonly handwritingEngine: IHandwritingEngine,
    config?: DrawingHandwritingBridgeConfig
  ) {
    this.config = {
      debounceMs: config?.debounceMs ?? 300,
      minPointsCount: config?.minPointsCount ?? 2
    };
  }

  /**
   * Starts listening to completed strokes on the drawing engine to trigger handwriting recognition.
   */
  public start(): void {
    if (this.unsubscriber) {
      return;
    }

    this.unsubscriber = this.drawingEngine.eventBus.subscribe(
      "StrokeCompleted",
      (event: any) => {
        const { pointsCount } = event.payload;
        if (pointsCount < this.config.minPointsCount) {
          return;
        }

        // Trigger recognition asynchronously with debounce to ensure fluid drawing interactions
        this.triggerRecognitionWithDebounce();
      }
    );
  }

  /**
   * Stops listening to drawing engine events and clears active timers.
   */
  public stop(): void {
    if (this.unsubscriber) {
      this.unsubscriber();
      this.unsubscriber = null;
    }
    this.clearDebounceTimer();
  }

  private triggerRecognitionWithDebounce(): void {
    this.clearDebounceTimer();

    this.debounceTimer = setTimeout(() => {
      this.processStrokes();
    }, this.config.debounceMs);
  }

  private clearDebounceTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Maps completed stroke coordinates and invokes the handwriting engine.
   */
  private processStrokes(): void {
    const strokes = this.drawingEngine.getStrokes();
    if (strokes.length === 0) return;

    // Convert strokes while preserving original point coordinates completely untouched
    const strokeGroups: Stroke2D[] = strokes.map(s => 
      s.points.map(pt => ({
        x: pt.x,
        y: pt.y
      }))
    );

    const strokeIds = strokes.map(s => s.id);

    try {
      this.handwritingEngine.recognize(strokeGroups, strokeIds).catch(err => {
        console.error(`[DrawingHandwritingBridgeError] Handwriting recognition promise rejected:`, err);
      });
    } catch (err) {
      console.error(`[DrawingHandwritingBridgeError] Handwriting recognition execution failed:`, err);
    }
  }
}
