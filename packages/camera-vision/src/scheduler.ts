import { IFrameScheduler } from "./interfaces";
import { FrameData } from "./types";

/**
 * Production-quality Frame Scheduler.
 * Implements adaptive FPS scaling, starvation prevention, and duplicate processing checks.
 */
export class FrameScheduler implements IFrameScheduler {
  private consumers: Set<(frame: FrameData) => Promise<void> | void> = new Set();
  private targetFps = 30;
  private adaptiveFps = 30;
  private lastProcessedFrameId = "";
  private lastProcessedTime = 0;
  private isProcessing = false;

  // Starvation configuration (maximum allowed ms without dispatching any frame)
  private readonly starvationThresholdMs = 1000;
  private readonly minFps = 5;

  // Adaptive smoothing factors
  private readonly decayFactor = 0.95; // Smoothing average
  private smoothedProcessingTimeMs = 0;

  constructor() {}

  public registerConsumer(consumer: (frame: FrameData) => Promise<void> | void): void {
    this.consumers.add(consumer);
  }

  public setTargetFPS(fps: number): void {
    this.targetFps = Math.max(this.minFps, fps);
    this.adaptiveFps = this.targetFps;
  }

  public getTargetFPS(): number {
    return this.targetFps;
  }

  public getAdaptiveFPS(): number {
    return this.adaptiveFps;
  }

  /**
   * Evaluates if frame should be dispatched or dropped based on backpressure,
   * duplicate processing rules, and starvation guidelines.
   */
  public scheduleFrame(frame: FrameData): void {
    // Avoid duplicate processing
    if (frame.id === this.lastProcessedFrameId) {
      return;
    }

    const now = Date.now();
    const timeSinceLastFrame = now - this.lastProcessedTime;

    // Starvation check: Force dispatch if starvation threshold is reached
    const isStarved = timeSinceLastFrame > this.starvationThresholdMs;

    if (this.isProcessing && !isStarved) {
      // Slow consumer backpressure: Drop frame
      return;
    }

    // Adaptive FPS check: Check if current frame rate satisfies the adaptive budget
    const budgetMs = 1000 / this.adaptiveFps;
    if (timeSinceLastFrame < budgetMs && !isStarved) {
      // Pacing check: Drop frame to preserve target FPS rate limit
      return;
    }

    // Process the frame
    this.dispatchFrame(frame);
  }

  public stop(): void {
    this.consumers.clear();
    this.isProcessing = false;
    this.lastProcessedFrameId = "";
  }

  private dispatchFrame(frame: FrameData): void {
    this.isProcessing = true;
    this.lastProcessedFrameId = frame.id;
    const startTime = performance.now();

    if (this.consumers.size === 0) {
      this.isProcessing = false;
      this.lastProcessedTime = Date.now();
      return;
    }

    let completed = 0;
    const total = this.consumers.size;

    const onConsumerDone = () => {
      completed++;
      if (completed === total) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.updateAdaptiveFPS(duration);
        this.isProcessing = false;
        this.lastProcessedTime = Date.now();
      }
    };

    for (const consumer of this.consumers) {
      (async () => {
        try {
          const result = consumer(frame);
          if (result instanceof Promise) {
            await result;
          }
        } catch {
          // Suppress consumer failure to protect scheduling queue
        } finally {
          onConsumerDone();
        }
      })();
    }
  }

  private updateAdaptiveFPS(durationMs: number): void {
    // Smooth processing time using exponential moving average
    if (this.smoothedProcessingTimeMs === 0) {
      this.smoothedProcessingTimeMs = durationMs;
    } else {
      this.smoothedProcessingTimeMs =
        this.smoothedProcessingTimeMs * this.decayFactor + durationMs * (1 - this.decayFactor);
    }

    // Target FPS frame budget
    const targetBudgetMs = 1000 / this.targetFps;

    if (this.smoothedProcessingTimeMs > targetBudgetMs) {
      // Consumers are slow: scale down adaptive FPS linearly, bounded by minFps
      const rawFps = 1000 / this.smoothedProcessingTimeMs;
      this.adaptiveFps = Math.max(this.minFps, Math.floor(rawFps));
    } else {
      // Consumers are fast: recover and scale up adaptive FPS towards targetFps
      this.adaptiveFps = Math.min(this.targetFps, this.adaptiveFps + 1);
    }
  }
}
