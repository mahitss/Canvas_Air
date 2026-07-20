import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FrameAcquisitionService } from "../src/acquisition";
import { ICameraManager } from "../src/interfaces";

describe("Frame Acquisition Service", () => {
  let mockCameraManager: ICameraManager;
  let acquisitionService: FrameAcquisitionService;
  let mockStream: any;

  beforeEach(() => {
    mockStream = {
      active: true,
      getVideoTracks: () => [{ stop: vi.fn() }],
      getTracks: () => [{ stop: vi.fn() }]
    };

    mockCameraManager = {
      listDevices: vi.fn(),
      startStream: vi.fn(),
      stopStream: vi.fn(),
      isStreaming: vi.fn().mockReturnValue(true),
      getActiveConfig: vi.fn().mockReturnValue({
        deviceId: "cam-1",
        width: 640,
        height: 480,
        frameRate: 30
      }),
      getActiveStream: vi.fn().mockReturnValue(mockStream)
    };

    class MockImageData {
      public data: Uint8ClampedArray;
      public width: number;
      public height: number;
      constructor(data: Uint8ClampedArray, width: number, height: number) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    }

    vi.stubGlobal("ImageData", MockImageData);
    vi.stubGlobal("window", {
      cancelAnimationFrame: vi.fn(),
      requestAnimationFrame: (cb: any) => setTimeout(cb, 16)
    });

    acquisitionService = new FrameAcquisitionService(mockCameraManager);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should capture single frame snapshot successfully", async () => {
    const frame = await acquisitionService.captureFrame();

    expect(frame).toBeDefined();
    expect(frame.id).toMatch(/^frame-\d+$/);
    expect(frame.timestamp).toBeGreaterThan(0);
    expect(frame.width).toBe(640);
    expect(frame.height).toBe(480);
    expect(frame.data).toBeDefined();
  });

  it("should trigger CaptureStarted event on starting capture", () => {
    const events: any[] = [];
    acquisitionService.subscribe((ev) => events.push(ev));

    acquisitionService.startCapture({ fps: 30 });

    expect(events[0]).toEqual({ type: "CaptureStarted" });
    expect(acquisitionService.isCapturing()).toBe(true);

    acquisitionService.stopCapture();
  });

  it("should trigger CaptureStopped event on stopping capture", () => {
    const events: any[] = [];
    acquisitionService.subscribe((ev) => events.push(ev));

    acquisitionService.startCapture({ fps: 30 });
    acquisitionService.stopCapture();

    expect(events).toContainEqual({ type: "CaptureStopped" });
    expect(acquisitionService.isCapturing()).toBe(false);
  });

  it("should support pausing and resuming capture loops", () => {
    acquisitionService.startCapture({ fps: 30 });
    acquisitionService.pauseCapture();
    expect(acquisitionService.isPaused()).toBe(true);

    acquisitionService.resumeCapture();
    expect(acquisitionService.isPaused()).toBe(false);

    acquisitionService.stopCapture();
  });

  it("should emit FrameCaptured events on active loop ticks", async () => {
    const events: any[] = [];
    acquisitionService.subscribe((ev) => events.push(ev));

    acquisitionService.startCapture({ fps: 60 });

    // Wait for animation frame tick to execute
    await new Promise((resolve) => setTimeout(resolve, 50));

    acquisitionService.stopCapture();

    const capturedEvents = events.filter((e) => e.type === "FrameCaptured");
    expect(capturedEvents.length).toBeGreaterThan(0);
    expect(capturedEvents[0].payload.id).toBeDefined();
  });

  it("should enforce backpressure when downstreams are busy", async () => {
    const events: any[] = [];
    
    // Slow async handler that never finishes
    acquisitionService.subscribe(async (ev) => {
      events.push(ev);
      if (ev.type === "FrameCaptured") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });

    acquisitionService.startCapture({ fps: 120 });

    // Wait for loop cycles
    await new Promise((resolve) => setTimeout(resolve, 80));

    acquisitionService.stopCapture();

    const capturedEvents = events.filter((e) => e.type === "FrameCaptured");
    // Backpressure should block subsequent frames, leading to only 1 frame captured
    expect(capturedEvents.length).toBe(1);
  });
});
