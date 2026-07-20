/**
 * Camera Device representation.
 */
export interface CameraDevice {
  id: string;
  label: string;
  capabilities: MediaTrackCapabilities;
}

/**
 * Configuration schema for the active video stream loop.
 */
export interface StreamConfig {
  deviceId: string;
  width: number;
  height: number;
  frameRate: number;
}

/**
 * Container holding captured frame structures.
 */
export interface FrameData {
  id: string;
  timestamp: number;
  width: number;
  height: number;
  data: ImageData;
}

export interface PerformanceStats {
  frameRateActual: number;
  latencyMs: number;
  droppedFramesCount: number;
  processingTimeMs: number;

  fps: number;
  droppedFrames: number;
  captureLatencyMs: number;
  workerLatencyMs: number;
  memoryUsageBytes: number;
  cpuUsagePercent: number;
  averageProcessingTimeMs: number;
}

/**
 * Base custom error class for the module.
 */
export class CameraVisionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "CameraVisionError";
  }
}

export class CameraAccessError extends CameraVisionError {
  constructor(message: string) {
    super(message, "CAMERA_ACCESS_DENIED");
  }
}

export class StreamLifecycleError extends CameraVisionError {
  constructor(message: string) {
    super(message, "STREAM_LIFECYCLE_FAILURE");
  }
}

export class FrameAcquisitionError extends CameraVisionError {
  constructor(message: string) {
    super(message, "FRAME_ACQUISITION_FAILURE");
  }
}

/**
 * Pub/sub events mapping definition.
 */
export type CameraStreamEvent =
  | { type: "STREAM_STARTED"; payload: { streamId: string; config: StreamConfig } }
  | { type: "STREAM_STOPPED"; payload: { streamId: string } }
  | { type: "FRAME_CAPTURED"; payload: { frame: FrameData } }
  | { type: "PERFORMANCE_REPORTED"; payload: { stats: PerformanceStats } };

/**
 * Camera Permission States.
 */
export type PermissionState =
  | "PermissionGranted"
  | "PermissionDenied"
  | "PermissionRevoked"
  | "PermissionUnknown";

/**
 * Camera Frame Capture Events.
 */
export type CaptureEvent =
  | { type: "FrameCaptured"; payload: FrameData }
  | { type: "CaptureStarted" }
  | { type: "CaptureStopped" }
  | { type: "CaptureError"; payload: { message: string } };
