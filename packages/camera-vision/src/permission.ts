import { ICameraPermissionService } from "./interfaces";
import { PermissionState } from "./types";

/**
 * Production-quality Camera Permission Service.
 * Implements fallback safety checks for older browsers and Safari capabilities constraints.
 */
export class CameraPermissionService implements ICameraPermissionService {
  private changeCallback: ((state: PermissionState) => void) | null = null;
  private statusRef: PermissionStatus | null = null;

  constructor() {
    this.initPermissionListener().catch(() => {
      // Catch silently for environment compatibility
    });
  }

  /**
   * Queries browser permissions API mapping to exposed states.
   */
  public async queryState(): Promise<PermissionState> {
    if (typeof window === "undefined" || !navigator?.permissions?.query) {
      return "PermissionUnknown";
    }

    try {
      // Some browsers require cast for custom/camera name queries
      const status = await navigator.permissions.query({ name: "camera" as PermissionName });
      return this.mapState(status.state);
    } catch {
      // Browser does not support querying camera permission directly
      return "PermissionUnknown";
    }
  }

  /**
   * Prompts user for camera input permissions.
   */
  public async requestPermission(): Promise<PermissionState> {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      return "PermissionUnknown";
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop track immediately to avoid keeping the camera active
      stream.getTracks().forEach((track) => track.stop());
      return "PermissionGranted";
    } catch (error) {
      const message = error instanceof Error ? error.name : "";
      if (message === "NotAllowedError" || message === "PermissionDeniedError") {
        return "PermissionDenied";
      }
      return "PermissionDenied";
    }
  }

  public onStateChange(callback: (state: PermissionState) => void): void {
    this.changeCallback = callback;
  }

  public dispose(): void {
    if (this.statusRef) {
      this.statusRef.onchange = null;
      this.statusRef = null;
    }
    this.changeCallback = null;
  }

  private async initPermissionListener(): Promise<void> {
    if (typeof window === "undefined" || !navigator?.permissions?.query) {
      return;
    }

    try {
      const status = await navigator.permissions.query({ name: "camera" as PermissionName });
      this.statusRef = status;
      status.onchange = () => {
        if (this.changeCallback) {
          this.changeCallback(this.mapState(status.state));
        }
      };
    } catch {
      // Query not supported
    }
  }

  private mapState(state: string): PermissionState {
    switch (state) {
      case "granted":
        return "PermissionGranted";
      case "denied":
        return "PermissionDenied";
      case "prompt":
        return "PermissionUnknown";
      default:
        return "PermissionUnknown";
    }
  }
}
