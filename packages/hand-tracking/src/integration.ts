import { IFrameAcquisitionService, FrameData } from "@visioncanvas/camera-vision";
import { IHandTrackingEngine, ICameraVisionHandTrackingBridge } from "./interfaces";

/**
 * Production-quality Computer Vision & Hand Tracking Integration Bridge.
 * Binds frame capture callbacks, enforces order preservation, and manages backpressure skips.
 */
export class CameraVisionHandTrackingBridge implements ICameraVisionHandTrackingBridge {
  private active = false;
  private isProcessing = false;
  private unsubscribeFrameService: (() => void) | null = null;

  constructor(
    private readonly acquisitionService: IFrameAcquisitionService,
    private readonly engine: IHandTrackingEngine
  ) {}

  public start(): void {
    if (this.active) {
      return;
    }

    this.active = true;

    // Subscribe to captured frame events
    this.unsubscribeFrameService = this.acquisitionService.subscribe((event) => {
      if (event.type === "FrameCaptured") {
        this.handleFrame(event.payload);
      }
    });
  }

  public stop(): void {
    if (!this.active) {
      return;
    }

    if (this.unsubscribeFrameService) {
      this.unsubscribeFrameService();
      this.unsubscribeFrameService = null;
    }

    this.engine.unsubscribeAll();
    this.active = false;
    this.isProcessing = false;
  }

  public isActive(): boolean {
    return this.active;
  }

  private handleFrame(frame: FrameData): void {
    // Backpressure: Drop frame if previous is still processing to preserve loop speeds
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    // Process asynchronously but in exact sequence order
    (async () => {
      try {
        await this.engine.processFrame(frame);
      } catch {
        // Engine handles tracking errors internally
      } finally {
        this.isProcessing = false;
      }
    })();
  }
}
