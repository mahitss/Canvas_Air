import { FrameData } from "@visioncanvas/camera-vision";
import { IHandDetector, IHandTracker, IHandTrackingEngine, IHandLandmarkSmoother } from "./interfaces";
import { HandPresence, HandTrackingEvent } from "./types";

/**
 * Optimized, production-quality Hand Tracking Engine.
 * Implements object pools to minimize GC allocations, and adaptive frame skipping based on processing latency budgets.
 */
export class HandTrackingEngine implements IHandTrackingEngine {
  private subscribers: Set<(event: HandTrackingEvent) => void> = new Set();
  
  // Performance and Adaptive controls
  private avgProcessingTimeMs = 0.0;
  private readonly emaAlpha = 0.2;
  private frameCount = 0;
  private isTracking = false;

  // Object pooling for HandPresence structures to avoid garbage collection pressure
  private readonly handPresencePool: HandPresence[] = Array.from({ length: 4 }, () => ({
    id: "",
    type: "right",
    confidence: 0,
    landmarks: {} as any,
    timestamp: 0
  }));
  private poolIndex = 0;

  constructor(
    private readonly detector: IHandDetector,
    private readonly tracker: IHandTracker,
    private readonly smoother?: IHandLandmarkSmoother,
    private readonly maxBudgetMs: number = 16.0
  ) {}

  private acquireHandPresence(id: string, type: "left" | "right", confidence: number, landmarks: any, timestamp: number): HandPresence {
    const hand = this.handPresencePool[this.poolIndex % 4]!;
    this.poolIndex++;
    hand.id = id;
    hand.type = type;
    hand.confidence = confidence;
    hand.landmarks = landmarks;
    hand.timestamp = timestamp;
    return hand;
  }

  public async processFrame(frame: FrameData): Promise<void> {
    if (!this.isTracking) {
      this.isTracking = true;
      this.emit({ type: "TrackingStarted", payload: { timestamp: frame.timestamp } });
    }

    const startTime = performance.now();

    // Adaptive Skipping: If average processing latency exceeds budget, skip alternate frame execution to protect UI threads
    this.frameCount++;
    if (this.avgProcessingTimeMs > this.maxBudgetMs && this.frameCount % 2 === 0) {
      return;
    }

    try {
      const detected = await this.detector.detect(frame);
      
      // Skip redundant tracking computation when no hands are detected
      if (detected.length === 0) {
        return;
      }

      const tracked = this.tracker.track(detected);

      for (const hand of tracked) {
        const smoothedHand = this.smoother ? this.smoother.smooth(hand) : hand;
        const pooledHand = this.acquireHandPresence(
          smoothedHand.id,
          smoothedHand.type,
          smoothedHand.confidence,
          smoothedHand.landmarks,
          smoothedHand.timestamp
        );
        this.emit({
          type: "LandmarksUpdated",
          payload: { hand: pooledHand, frameId: frame.id }
        });
      }
    } catch (error) {
      this.emit({
        type: "TrackingError",
        payload: { error: error instanceof Error ? error : new Error(String(error)), timestamp: frame.timestamp }
      });
    } finally {
      const endTime = performance.now();
      const elapsed = endTime - startTime;
      this.avgProcessingTimeMs = this.emaAlpha * elapsed + (1 - this.emaAlpha) * this.avgProcessingTimeMs;
    }
  }

  public subscribe(callback: (event: HandTrackingEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public unsubscribeAll(): void {
    this.subscribers.clear();
    if (this.isTracking) {
      this.isTracking = false;
      this.emit({ type: "TrackingStopped", payload: { timestamp: Date.now() } });
    }
  }

  private emit(event: HandTrackingEvent): void {
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch {
        // Suppress callback failures
      }
    }
  }
}
