import { ICameraManager } from "./interfaces";
import { CameraDevice, StreamConfig, CameraAccessError, StreamLifecycleError } from "./types";

/**
 * Production-quality Camera Manager implementation wrapping browser MediaDevices APIs.
 * Supports hotplugging detection, connection lifecycle hooks, and server-side fallback safety.
 */
export class CameraManager implements ICameraManager {
  private activeStream: MediaStream | null = null;
  private activeConfig: StreamConfig | null = null;
  private onDeviceChangeCallback: (() => void) | null = null;

  constructor() {
    this.registerHotplugListener();
  }

  /**
   * Enumerates available webcam devices.
   */
  public async listDevices(): Promise<CameraDevice[]> {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      // Prompt camera permissions if not granted to retrieve labels
      await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => {
        throw new CameraAccessError("Camera permission request rejected.");
      });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      return videoDevices.map((d) => ({
        id: d.deviceId,
        label: d.label || `Webcam ${d.deviceId.substring(0, 5)}`,
        capabilities: {} as MediaTrackCapabilities
      }));
    } catch (error) {
      if (error instanceof CameraAccessError) {
        throw error;
      }
      throw new CameraAccessError(`Failed to list devices: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Binds and activates webcam streams.
   */
  public async startStream(config: StreamConfig): Promise<void> {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      throw new StreamLifecycleError("MediaDevices API is unavailable in this runtime context.");
    }

    try {
      await this.stopStream();

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: config.width },
        height: { ideal: config.height },
        frameRate: { ideal: config.frameRate }
      };

      if (config.deviceId) {
        videoConstraints.deviceId = { exact: config.deviceId };
      }

      const constraints: MediaStreamConstraints = {
        video: videoConstraints
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints).catch((err) => {
        throw new StreamLifecycleError(`Failed to bind device media stream: ${err.message}`);
      });

      this.activeStream = stream;
      this.activeConfig = config;

      // Register disconnect listeners on tracks
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          this.handleDisconnect();
        };
      });
    } catch (error) {
      if (error instanceof StreamLifecycleError) {
        throw error;
      }
      throw new StreamLifecycleError(`Failed to start stream: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gracefully releases stream tracks resources.
   */
  public async stopStream(): Promise<void> {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      this.activeStream = null;
    }
    this.activeConfig = null;
  }

  public isStreaming(): boolean {
    return this.activeStream !== null && this.activeStream.active;
  }

  public getActiveConfig(): StreamConfig | null {
    return this.activeConfig;
  }

  public getActiveStream(): MediaStream | null {
    return this.activeStream;
  }

  /**
   * Registers custom listener tracking camera updates.
   */
  public onDeviceChange(callback: () => void): void {
    this.onDeviceChangeCallback = callback;
  }

  private registerHotplugListener(): void {
    if (typeof window !== "undefined" && navigator?.mediaDevices) {
      navigator.mediaDevices.ondevicechange = () => {
        if (this.onDeviceChangeCallback) {
          this.onDeviceChangeCallback();
        }
      };
    }
  }

  private handleDisconnect(): void {
    this.stopStream().catch(() => {
      // Log failure silently
    });
  }
}
