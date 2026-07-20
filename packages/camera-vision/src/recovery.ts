import { ICameraManager, ICameraRecoveryService, ICameraWorkerClient, IFrameAcquisitionService } from "./interfaces";

/**
 * Production-quality Camera Pipeline Recovery Service.
 * Implements exponential retry strategies, graceful degradation, and structured recovery logs.
 */
export class CameraRecoveryService implements ICameraRecoveryService {
  private logs: Array<{ timestamp: number; event: string; details?: string | undefined }> = [];
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor(
    private readonly cameraManager: ICameraManager,
    private readonly acquisitionService: IFrameAcquisitionService,
    private readonly workerClient: ICameraWorkerClient
  ) {}

  public getRecoveryLogs(): Array<{ timestamp: number; event: string; details?: string | undefined }> {
    return this.logs;
  }

  public async handleUnplug(): Promise<void> {
    this.log("DEVICE_UNPLUGGED", "Active camera device unplugged.");
    this.acquisitionService.stopCapture();

    try {
      const devices = await this.cameraManager.listDevices();
      const fallbackCam = devices[0];
      if (fallbackCam) {
        this.log("FALLBACK_DEVICE_FOUND", `Fallback camera found: ${fallbackCam.label}`);
        const activeConfig = this.cameraManager.getActiveConfig();
        if (activeConfig) {
          const newConfig = { ...activeConfig, deviceId: fallbackCam.id };
          await this.cameraManager.startStream(newConfig);
          this.acquisitionService.startCapture({ fps: activeConfig.frameRate });
          this.log("RECOVERY_SUCCESS", "Pipeline recovered on fallback camera.");
          return;
        }
      }
      this.log("DEGRADATION_ACTIVE", "No fallback camera available. Pipeline halted.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log("RECOVERY_FAILED", `Failed to recover fallback camera: ${msg}`);
    }
  }

  public async handlePermissionRevoked(): Promise<void> {
    this.log("PERMISSION_REVOKED", "Camera permissions revoked by user.");
    this.acquisitionService.stopCapture();
    await this.cameraManager.stopStream();
    this.log("DEGRADATION_ACTIVE", "Camera stream paused to respect user settings.");
  }

  public async handleStreamInterruption(): Promise<void> {
    this.log("STREAM_INTERRUPTED", "Video track stream interrupted.");
    this.acquisitionService.stopCapture();

    const activeConfig = this.cameraManager.getActiveConfig();
    if (!activeConfig) {
      this.log("RECOVERY_ABORTED", "No active stream config to restart.");
      return;
    }

    this.retryCount = 0;
    await this.executeStreamRestart(activeConfig);
  }

  public async handleWorkerCrash(): Promise<void> {
    this.log("WORKER_CRASHED", "Background processing worker crashed.");
    try {
      this.workerClient.terminate();
      // Client implementation automatically handles re-initialization on next frame posts
      this.log("RECOVERY_SUCCESS", "Background worker client reset successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log("RECOVERY_FAILED", `Worker restart failed: ${msg}`);
    }
  }

  public async handleBrowserError(error: Error): Promise<void> {
    this.log("BROWSER_ERROR", `Unexpected browser error: ${error.message}`);
    this.acquisitionService.stopCapture();
    await this.cameraManager.stopStream();
    this.log("DEGRADATION_ACTIVE", "Camera pipeline halted due to browser runtime failure.");
  }

  private log(event: string, details?: string): void {
    this.logs.push({
      timestamp: Date.now(),
      event,
      details
    });
  }

  private async executeStreamRestart(config: any): Promise<void> {
    if (this.retryCount >= this.maxRetries) {
      this.log("RECOVERY_FAILED", `Stream restart failed after ${this.maxRetries} retry attempts.`);
      this.log("DEGRADATION_ACTIVE", "Pipeline suspended.");
      return;
    }

    const backoffMs = Math.pow(3, this.retryCount) * 100; // Exponential backoff: 100ms, 300ms, 900ms
    this.retryCount++;

    this.log("RETRY_SCHEDULED", `Scheduling restart retry ${this.retryCount} in ${backoffMs}ms`);

    await new Promise((resolve) => setTimeout(resolve, backoffMs));

    try {
      await this.cameraManager.startStream(config);
      this.acquisitionService.startCapture({ fps: config.frameRate });
      this.log("RECOVERY_SUCCESS", "Stream restarted and capture resumed successfully.");
    } catch {
      await this.executeStreamRestart(config);
    }
  }
}
