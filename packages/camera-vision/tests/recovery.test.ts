import { describe, it, expect, beforeEach, vi } from "vitest";
import { CameraRecoveryService } from "../src/recovery";
import { ICameraManager, IFrameAcquisitionService, ICameraWorkerClient } from "../src/interfaces";

describe("Camera Pipeline Recovery Service", () => {
  let recoveryService: CameraRecoveryService;
  let mockCameraManager: ICameraManager;
  let mockAcquisitionService: IFrameAcquisitionService;
  let mockWorkerClient: ICameraWorkerClient;

  beforeEach(() => {
    mockCameraManager = {
      listDevices: vi.fn().mockResolvedValue([
        { id: "fallback-cam", label: "Fallback Web Camera", kind: "videoinput" }
      ]),
      startStream: vi.fn(),
      stopStream: vi.fn(),
      isStreaming: vi.fn(),
      getActiveConfig: vi.fn().mockReturnValue({
        deviceId: "primary-cam",
        width: 1280,
        height: 720,
        frameRate: 30
      }),
      getActiveStream: vi.fn()
    };

    mockAcquisitionService = {
      captureFrame: vi.fn(),
      subscribe: vi.fn(),
      unsubscribeAll: vi.fn(),
      startCapture: vi.fn(),
      stopCapture: vi.fn(),
      pauseCapture: vi.fn(),
      resumeCapture: vi.fn(),
      isPaused: vi.fn(),
      isCapturing: vi.fn()
    };

    mockWorkerClient = {
      postFrame: vi.fn(),
      terminate: vi.fn(),
      onError: vi.fn()
    };

    recoveryService = new CameraRecoveryService(
      mockCameraManager,
      mockAcquisitionService,
      mockWorkerClient
    );
  });

  it("should switch to fallback camera on device unplug events", async () => {
    await recoveryService.handleUnplug();

    expect(mockAcquisitionService.stopCapture).toHaveBeenCalled();
    expect(mockCameraManager.listDevices).toHaveBeenCalled();
    expect(mockCameraManager.startStream).toHaveBeenCalledWith({
      deviceId: "fallback-cam",
      width: 1280,
      height: 720,
      frameRate: 30
    });
    expect(mockAcquisitionService.startCapture).toHaveBeenCalledWith({ fps: 30 });

    const logs = recoveryService.getRecoveryLogs();
    expect(logs[0].event).toBe("DEVICE_UNPLUGGED");
    expect(logs[2].event).toBe("RECOVERY_SUCCESS");
  });

  it("should stop streams and halt capture on user permission revocation", async () => {
    await recoveryService.handlePermissionRevoked();

    expect(mockAcquisitionService.stopCapture).toHaveBeenCalled();
    expect(mockCameraManager.stopStream).toHaveBeenCalled();

    const logs = recoveryService.getRecoveryLogs();
    expect(logs[0].event).toBe("PERMISSION_REVOKED");
    expect(logs[1].event).toBe("DEGRADATION_ACTIVE");
  });

  it("should attempt exponential backoff stream restarts on stream interruptions", async () => {
    // Make startStream throw errors to simulate consecutive failures
    vi.mocked(mockCameraManager.startStream).mockRejectedValue(new Error("Stream busy"));

    const recoveryPromise = recoveryService.handleStreamInterruption();

    // Verify it schedules restarts and increments retry counts
    const logs = recoveryService.getRecoveryLogs();
    expect(logs[0].event).toBe("STREAM_INTERRUPTED");

    await recoveryPromise;

    // After 3 failures it should halt and mark as degraded
    expect(mockCameraManager.startStream).toHaveBeenCalledTimes(3);
    expect(logs[logs.length - 1].event).toBe("DEGRADATION_ACTIVE");
  });

  it("should terminate and restart background worker on worker crashes", async () => {
    await recoveryService.handleWorkerCrash();

    expect(mockWorkerClient.terminate).toHaveBeenCalled();
    const logs = recoveryService.getRecoveryLogs();
    expect(logs[0].event).toBe("WORKER_CRASHED");
    expect(logs[1].event).toBe("RECOVERY_SUCCESS");
  });
});
