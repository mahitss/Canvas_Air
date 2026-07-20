import { IHandTrackingEngine, HandPresence } from "@visioncanvas/hand-tracking";
import { IGestureRecognitionEngine, IMultiHandGestureEngine } from "./interfaces";
import { GestureEvent } from "./types";

/**
 * Integration Bridge coordinating Hand Tracking and Gesture Recognition Engines.
 * Subscribes to tracking events, resolves single/multi-hand updates sequentially,
 * groups hands by frameId, and exposes recognized gestures through public subscription events.
 */
export class HandTrackingGestureBridge {
  private unsubscribeTracking: (() => void) | null = null;
  private processingChain: Promise<void> = Promise.resolve();
  
  private lastTimestamp = 0;
  private pendingFrameId: string | null = null;
  private pendingHands: HandPresence[] = [];

  constructor(
    private readonly trackingEngine: IHandTrackingEngine,
    private readonly gestureEngine: IGestureRecognitionEngine,
    private readonly multiHandEngine?: IMultiHandGestureEngine
  ) {
    this.start();
  }

  /**
   * Subscribes to the hand tracking engine and starts forwarding frame outputs.
   */
  public start(): void {
    if (this.unsubscribeTracking) return;

    this.unsubscribeTracking = this.trackingEngine.subscribe((event) => {
      if (event.type === "LandmarksUpdated") {
        this.handleLandmarks(event.payload.hand, event.payload.frameId);
      } else if (event.type === "HandLost" && this.multiHandEngine) {
        // Disappearing hand cleans history buffers
        this.multiHandEngine.processHands([]);
      }
    });
  }

  /**
   * Stops tracking integrations and unsubscribes from the tracking engine.
   */
  public stop(): void {
    if (this.unsubscribeTracking) {
      this.unsubscribeTracking();
      this.unsubscribeTracking = null;
    }
    this.pendingHands = [];
    this.pendingFrameId = null;
  }

  /**
   * Subscribes to recognized gesture events from the primary gesture engine.
   */
  public subscribe(callback: (event: GestureEvent) => void): () => void {
    const unsubSingle = this.gestureEngine.subscribe(callback);
    const unsubMulti = this.multiHandEngine ? this.multiHandEngine.subscribe(callback) : () => {};

    return () => {
      unsubSingle();
      unsubMulti();
    };
  }

  private handleLandmarks(hand: HandPresence, frameId: string): void {
    // Drop outdated landmark updates to preserve temporal integrity
    if (hand.timestamp < this.lastTimestamp) {
      return;
    }
    this.lastTimestamp = hand.timestamp;

    // Group hands of the same frameId for Multi-Hand engine evaluation
    if (this.pendingFrameId !== frameId) {
      if (this.pendingHands.length > 0 && this.multiHandEngine) {
        this.multiHandEngine.processHands(this.pendingHands);
        this.pendingHands = [];
      }
      this.pendingFrameId = frameId;

      // Queue flushing at the end of the current microtask tick (when all hands for this frame are processed)
      queueMicrotask(() => {
        if (this.pendingHands.length > 0 && this.multiHandEngine) {
          this.multiHandEngine.processHands(this.pendingHands);
          this.pendingHands = [];
        }
        this.pendingFrameId = null;
      });
    }

    this.pendingHands.push(hand);

    // Queue single-hand gesture evaluation to guarantee exact frame ordering execution
    this.processingChain = this.processingChain.then(async () => {
      await this.gestureEngine.processHand(hand);
    }).catch(() => {
      // Isolate in-flight evaluation failures
    });
  }
}
