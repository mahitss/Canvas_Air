import { HandPresence, IHandTrackingEngine } from "@visioncanvas/hand-tracking";
import { IGestureRecognitionEngine } from "@visioncanvas/gesture-recognition";
import { DrawingEngine } from "./engine";

export interface IntegrationConfig {
  drawingGesture: string;       // e.g. "Pinch"
  minConfidence: number;        // e.g. 0.6
  debounceTimeMs: number;       // e.g. 150ms to preserve stroke continuity
}

/**
 * Integration Bridge coordinating Gesture Recognition and Air Drawing Engines.
 */
export class GestureDrawingBridge {
  private latestHands: Map<string, HandPresence> = new Map();
  private activeHandId: string | null = null;
  private isDrawing = false;
  private endTimeout: any = null;
  private unsubscribers: (() => void)[] = [];

  constructor(
    private readonly drawingEngine: DrawingEngine,
    private readonly trackingEngine: IHandTrackingEngine,
    private readonly gestureEngine: IGestureRecognitionEngine,
    private readonly config: IntegrationConfig = {
      drawingGesture: "Pinch",
      minConfidence: 0.6,
      debounceTimeMs: 150
    }
  ) {}

  /**
   * Starts listening to gesture and tracking updates.
   */
  public start(): void {
    if (this.unsubscribers.length > 0) {
      return;
    }

    // 1. Subscribe to landmarks updates to cache coordinates
    const unsubTracking = this.trackingEngine.subscribe((event: any) => {
      if (event.type === "LandmarksUpdated") {
        this.handleHandUpdate(event.payload.hand);
      } else if (event.type === "HandLost") {
        this.handleHandLost(event.payload.handId);
      }
    });
    this.unsubscribers.push(unsubTracking);

    // 2. Subscribe to gesture events to trigger stroke start/end
    const unsubGesture = this.gestureEngine.subscribe((event: any) => {
      this.handleGestureEvent(event);
    });
    this.unsubscribers.push(unsubGesture);
  }

  /**
   * Stops listening and completes active drawing stroke cleanly.
   */
  public stop(): void {
    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = null;
    }

    if (this.isDrawing) {
      this.drawingEngine.completeStroke();
      this.isDrawing = false;
      this.activeHandId = null;
    }

    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.latestHands.clear();
  }

  private handleHandUpdate(hand: HandPresence): void {
    this.latestHands.set(hand.id, hand);

    if (this.isDrawing && this.activeHandId === hand.id) {
      const tip = hand.landmarks.index_tip;
      if (tip) {
        this.drawingEngine.addPoint(tip.x, tip.y);
      }
    }
  }

  private handleHandLost(handId: string): void {
    this.latestHands.delete(handId);
    if (this.isDrawing && this.activeHandId === handId) {
      // Cleanly complete stroke if drawing hand is lost
      this.drawingEngine.completeStroke();
      this.isDrawing = false;
      this.activeHandId = null;
    }
  }

  private handleGestureEvent(event: any): void {
    if (event.type === "GestureStarted") {
      const { gesture, handId, confidence } = event.payload.gesture;
      if (gesture === this.config.drawingGesture && confidence >= this.config.minConfidence) {
        this.onGestureStarted(handId);
      }
    } else if (event.type === "GestureEnded") {
      const { gesture, handId } = event.payload;
      if (gesture === this.config.drawingGesture) {
        this.onGestureEnded(handId);
      }
    }
  }

  private onGestureStarted(handId: string): void {
    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = null;
    }

    if (!this.isDrawing) {
      const hand = this.latestHands.get(handId);
      if (hand && hand.landmarks.index_tip) {
        const tip = hand.landmarks.index_tip;
        this.drawingEngine.startStroke(tip.x, tip.y);
        this.isDrawing = true;
        this.activeHandId = handId;
      }
    }
  }

  private onGestureEnded(handId: string): void {
    if (this.isDrawing && this.activeHandId === handId) {
      if (this.config.debounceTimeMs > 0) {
        if (this.endTimeout) {
          clearTimeout(this.endTimeout);
        }
        this.endTimeout = setTimeout(() => {
          if (this.isDrawing) {
            this.drawingEngine.completeStroke();
            this.isDrawing = false;
            this.activeHandId = null;
          }
          this.endTimeout = null;
        }, this.config.debounceTimeMs);
      } else {
        this.drawingEngine.completeStroke();
        this.isDrawing = false;
        this.activeHandId = null;
      }
    }
  }
}
