/**
 * Dependency Injection Tokens mapping interface identifiers.
 */
export const CAMERA_VISION_TOKENS = {
  CameraManager: Symbol.for("ICameraManager"),
  FrameAcquisitionService: Symbol.for("IFrameAcquisitionService"),
  PerformanceMonitor: Symbol.for("IPerformanceMonitor"),
  PermissionService: Symbol.for("ICameraPermissionService"),
  FrameScheduler: Symbol.for("IFrameScheduler"),
  WorkerClient: Symbol.for("ICameraWorkerClient"),
  RecoveryService: Symbol.for("ICameraRecoveryService")
} as const;
