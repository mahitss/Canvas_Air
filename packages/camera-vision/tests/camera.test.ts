import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CameraManager } from "../src/service";
import { CameraAccessError, StreamLifecycleError } from "../src/types";

describe("Camera Manager Service", () => {
  let cameraManager: CameraManager;
  let mockGetUserMedia: any;
  let mockEnumerateDevices: any;

  beforeEach(() => {
    // Mock browser APIs
    const mockTracks = [
      {
        stop: vi.fn(),
        onended: null
      }
    ];

    mockGetUserMedia = vi.fn().mockResolvedValue({
      active: true,
      getVideoTracks: () => mockTracks,
      getTracks: () => mockTracks
    });

    mockEnumerateDevices = vi.fn().mockResolvedValue([
      { deviceId: "cam-1", label: "Front Camera", kind: "videoinput" },
      { deviceId: "cam-2", label: "Back Camera", kind: "videoinput" },
      { deviceId: "mic-1", label: "Microphone", kind: "audioinput" }
    ]);

    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: mockGetUserMedia,
        enumerateDevices: mockEnumerateDevices,
        ondevicechange: null
      }
    });

    cameraManager = new CameraManager();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should list only videoinput camera devices", async () => {
    const devices = await cameraManager.listDevices();
    expect(devices).toHaveLength(2);
    expect(devices[0]?.id).toBe("cam-1");
    expect(devices[0]?.label).toBe("Front Camera");
    expect(devices[1]?.id).toBe("cam-2");
    expect(devices[1]?.label).toBe("Back Camera");
  });

  it("should throw CameraAccessError if permissions are rejected", async () => {
    mockGetUserMedia.mockRejectedValue(new Error("Permission denied"));

    await expect(cameraManager.listDevices()).rejects.toThrow(CameraAccessError);
  });

  it("should start and stop video stream successfully", async () => {
    const config = { deviceId: "cam-1", width: 640, height: 480, frameRate: 30 };
    await cameraManager.startStream(config);

    expect(cameraManager.isStreaming()).toBe(true);
    expect(cameraManager.getActiveConfig()).toEqual(config);

    await cameraManager.stopStream();
    expect(cameraManager.isStreaming()).toBe(false);
    expect(cameraManager.getActiveConfig()).toBeNull();
  });

  it("should trigger hotplug callback on device change events", async () => {
    const changeSpy = vi.fn();
    cameraManager.onDeviceChange(changeSpy);

    // Trigger mock event handler
    if (navigator.mediaDevices) {
      const handler = (navigator.mediaDevices as any).ondevicechange;
      expect(handler).toBeDefined();
      handler();
    }

    expect(changeSpy).toHaveBeenCalled();
  });
});
