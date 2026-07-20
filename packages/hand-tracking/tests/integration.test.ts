import { describe, it, expect, beforeEach, vi } from "vitest";
import { CameraVisionHandTrackingBridge } from "../src/integration";
import { IFrameAcquisitionService, FrameData } from "@visioncanvas/camera-vision";
import { IHandTrackingEngine } from "../src/interfaces";

describe("Camera Vision & Hand Tracking Integration Bridge", () => {
  let mockAcquisitionService: IFrameAcquisitionService;
  let mockEngine: IHandTrackingEngine;
  let bridge: CameraVisionHandTrackingBridge;
  let frameCallback: (event: any) => void;

  beforeEach(() => {
    mockAcquisitionService = {
      captureFrame: vi.fn(),
      subscribe: vi.fn().mockImplementation((cb) => {
        frameCallback = cb;
        return vi.fn(); // unsubscribe mock stub
      }),
      unsubscribeAll: vi.fn(),
      startCapture: vi.fn(),
      stopCapture: vi.fn(),
      pauseCapture: vi.fn(),
      resumeCapture: vi.fn(),
      isPaused: vi.fn(),
      isCapturing: vi.fn()
    };

    mockEngine = {
      processFrame: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      unsubscribeAll: vi.fn()
    };

    bridge = new CameraVisionHandTrackingBridge(mockAcquisitionService, mockEngine);
  });

  it("should subscribe to frame acquisition events upon start", () => {
    bridge.start();

    expect(bridge.isActive()).toBe(true);
    expect(mockAcquisitionService.subscribe).toHaveBeenCalled();
  });

  it("should process frame asynchronously on FrameCaptured events", async () => {
    bridge.start();

    const mockFrame: FrameData = {
      id: "frame-1",
      timestamp: 1000,
      width: 640,
      height: 480,
      data: {} as any
    };

    // Trigger FrameCaptured event
    frameCallback({ type: "FrameCaptured", payload: mockFrame });

    // Use microtask boundary check
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockEngine.processFrame).toHaveBeenCalledWith(mockFrame);
  });

  it("should drop subsequent frames if previous is still processing to handle backpressure", async () => {
    bridge.start();

    // Make processFrame take time to execute
    vi.mocked(mockEngine.processFrame).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const mockFrame1: FrameData = { id: "f-1", timestamp: 1000, width: 640, height: 480, data: {} as any };
    const mockFrame2: FrameData = { id: "f-2", timestamp: 1033, width: 640, height: 480, data: {} as any };

    // Push frame 1
    frameCallback({ type: "FrameCaptured", payload: mockFrame1 });
    // Push frame 2 immediately while frame 1 is still processing
    frameCallback({ type: "FrameCaptured", payload: mockFrame2 });

    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(mockEngine.processFrame).toHaveBeenCalledTimes(1);
    expect(mockEngine.processFrame).toHaveBeenCalledWith(mockFrame1);
    expect(mockEngine.processFrame).not.toHaveBeenCalledWith(mockFrame2); // Dropped!
  });

  it("should unsubscribe and disarm engine upon stop", () => {
    bridge.start();
    bridge.stop();

    expect(bridge.isActive()).toBe(false);
    expect(mockEngine.unsubscribeAll).toHaveBeenCalled();
  });
});
