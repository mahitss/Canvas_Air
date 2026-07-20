import { CameraDevice, StreamConfig, FrameData, PerformanceStats, PermissionState, CaptureEvent } from "./types";

/**
 * Interface coordinating camera identification and streaming operations.
 */
export interface ICameraManager {
  listDevices(): Promise<CameraDevice[]>;
  startStream(config: StreamConfig): Promise<void>;
  stopStream(): Promise<void>;
  isStreaming(): boolean;
  getActiveConfig(): StreamConfig | null;
  getActiveStream(): MediaStream | null;
}

/**
 * Interface processing frame acquisitions and distributing callbacks.
 */
export interface IFrameAcquisitionService {
  captureFrame(): Promise<FrameData>;
  subscribe(callback: (event: CaptureEvent) => void): () => void;
  unsubscribeAll(): void;
  startCapture(config: { fps: number }): void;
  stopCapture(): void;
  pauseCapture(): void;
  resumeCapture(): void;
  isPaused(): boolean;
  isCapturing(): boolean;
}

export interface IPerformanceMonitor {
  recordFrameProcessed(latencyMs: number, processingTimeMs: number): void;
  recordDroppedFrame(): void;
  recordCapture(latencyMs: number): void;
  recordWorker(latencyMs: number): void;
  updateSystemMetrics(): void;
  getStats(): PerformanceStats;
  reset(): void;
}

/**
 * Interface managing browser camera permission state query and requests.
 */
export interface ICameraPermissionService {
  queryState(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  onStateChange(callback: (state: PermissionState) => void): void;
  dispose(): void;
}

/**
 * Interface scheduling frame dispatches, managing adaptive FPS, backpressure, and consumer latency.
 */
export interface IFrameScheduler {
  registerConsumer(consumer: (frame: FrameData) => Promise<void> | void): void;
  scheduleFrame(frame: FrameData): void;
  setTargetFPS(fps: number): void;
  getTargetFPS(): number;
  getAdaptiveFPS(): number;
  stop(): void;
}

export interface ICameraWorkerClient {
  postFrame(frame: FrameData): Promise<void>;
  terminate(): void;
  onError(callback: (error: Error) => void): void;
}

/**
 * Interface coordinating camera pipeline recovery actions, retries and fallback operations.
 */
export interface ICameraRecoveryService {
  handleUnplug(): Promise<void>;
  handlePermissionRevoked(): Promise<void>;
  handleStreamInterruption(): Promise<void>;
  handleWorkerCrash(): Promise<void>;
  handleBrowserError(error: Error): Promise<void>;
  getRecoveryLogs(): Array<{ timestamp: number; event: string; details?: string | undefined }>;
}
