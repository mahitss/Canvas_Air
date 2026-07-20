import { ICameraManager, IFrameAcquisitionService } from "./interfaces";
import { FrameData, CaptureEvent, FrameAcquisitionError } from "./types";

/**
 * Production-quality Frame Acquisition Service.
 * Implements low-overhead canvas draw pools, backpressure relief, and configurable FPS loop.
 */
export class FrameAcquisitionService implements IFrameAcquisitionService {
  private subscribers: Set<(event: CaptureEvent) => void> = new Set();
  private capturing = false;
  private paused = false;
  private fps = 30;
  private frameIdCounter = 0;
  private timerId: any = null;
  private lastFrameTime = 0;

  // Reusable offscreen canvas & context to avoid constant allocations
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private videoElement: HTMLVideoElement | null = null;

  // Backpressure monitoring
  private pendingSubscribersCount = 0;

  constructor(private readonly cameraManager: ICameraManager) {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.videoElement = document.createElement("video");
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
    }
  }

  /**
   * Single frame capture snapshot.
   */
  public async captureFrame(): Promise<FrameData> {
    const stream = this.cameraManager.getActiveStream();
    if (!stream) {
      throw new FrameAcquisitionError("No active camera stream available for capture.");
    }

    if (typeof window === "undefined" || !this.canvas || !this.ctx || !this.videoElement) {
      // Server-side fallback or mock frame data
      const width = 640;
      const height = 480;
      const buffer = new Uint8ClampedArray(width * height * 4);
      const data = new ImageData(buffer, width, height);

      return {
        id: `frame-${this.frameIdCounter++}`,
        timestamp: Date.now(),
        width,
        height,
        data
      };
    }

    // Sync stream to video element if not already matched
    if (this.videoElement.srcObject !== stream) {
      this.videoElement.srcObject = stream;
      await this.videoElement.play().catch(() => {
        // Handle autoplay policies or aborts
      });
    }

    const width = this.videoElement.videoWidth || 640;
    const height = this.videoElement.videoHeight || 480;

    // Avoid resizing the canvas unless dimensions changed
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.ctx.drawImage(this.videoElement, 0, 0, width, height);
    const data = this.ctx.getImageData(0, 0, width, height);

    return {
      id: `frame-${this.frameIdCounter++}`,
      timestamp: Date.now(),
      width,
      height,
      data
    };
  }

  public subscribe(callback: (event: CaptureEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public unsubscribeAll(): void {
    this.subscribers.clear();
  }

  public startCapture(config: { fps: number }): void {
    if (this.capturing) {
      return;
    }

    this.fps = config.fps;
    this.capturing = true;
    this.paused = false;
    this.lastFrameTime = 0;

    this.emit({ type: "CaptureStarted" });
    this.scheduleNextCapture();
  }

  public stopCapture(): void {
    if (!this.capturing) {
      return;
    }

    this.capturing = false;
    this.paused = false;
    if (this.timerId !== null) {
      if (typeof window !== "undefined" && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(this.timerId);
      } else {
        clearTimeout(this.timerId);
      }
      this.timerId = null;
    }

    this.emit({ type: "CaptureStopped" });
  }

  public pauseCapture(): void {
    if (!this.capturing || this.paused) {
      return;
    }
    this.paused = true;
  }

  public resumeCapture(): void {
    if (!this.capturing || !this.paused) {
      return;
    }
    this.paused = false;
    this.lastFrameTime = 0;
    this.scheduleNextCapture();
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public isCapturing(): boolean {
    return this.capturing;
  }

  private scheduleNextCapture(): void {
    if (!this.capturing || this.paused) {
      return;
    }

    const interval = 1000 / this.fps;

    const captureLoop = async () => {
      if (!this.capturing || this.paused) {
        return;
      }

      const now = performance.now();
      const elapsed = now - this.lastFrameTime;

      if (elapsed >= interval) {
        this.lastFrameTime = now - (elapsed % interval);

        // BACKPRESSURE RELIEF:
        // Skip capture if subscribers are still processing the previous frame
        if (this.pendingSubscribersCount === 0) {
          try {
            const frame = await this.captureFrame();
            this.emitFrame(frame);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.emit({ type: "CaptureError", payload: { message } });
          }
        }
      }

      if (this.capturing && !this.paused) {
        if (typeof window !== "undefined" && window.requestAnimationFrame) {
          this.timerId = window.requestAnimationFrame(captureLoop);
        } else {
          this.timerId = setTimeout(captureLoop, interval);
        }
      }
    };

    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      this.timerId = window.requestAnimationFrame(captureLoop);
    } else {
      this.timerId = setTimeout(captureLoop, interval);
    }
  }

  private emit(event: CaptureEvent): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        // Catch handler errors to protect loop integrity
      }
    });
  }

  private emitFrame(frame: FrameData): void {
    if (this.subscribers.size === 0) {
      return;
    }

    this.pendingSubscribersCount = this.subscribers.size;

    for (const callback of this.subscribers) {
      (async () => {
        try {
          const result = callback({ type: "FrameCaptured", payload: frame });
          // Handle both synchronous callbacks and async Promises
          if ((result as any) instanceof Promise) {
            await result;
          }
        } catch {
          // Suppress subscriber exceptions to maintain acquisition stream
        } finally {
          this.pendingSubscribersCount = Math.max(0, this.pendingSubscribersCount - 1);
        }
      })();
    }
  }
}
