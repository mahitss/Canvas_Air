import { describe, it, expect, vi } from "vitest";
import { AudioCaptureService } from "../src/audio/capture";
import { AudioFrame } from "../src/interfaces";

describe("Audio Capture Pipeline", () => {
  it("should enumerate mock input audio devices", async () => {
    const service = new AudioCaptureService();
    const devices = await service.enumerateDevices();
    
    expect(devices.length).toBeGreaterThan(0);
    expect(devices[0].deviceId).toBeDefined();
    expect(devices[0].label).toBeDefined();
  });

  it("should register preferred device select updates", () => {
    const service = new AudioCaptureService();
    service.selectDevice("external-mic-id");
    expect(service.getPreferredDeviceId()).toBe("external-mic-id");
  });

  it("should stream audio frames with non-zero RMS values and correct timestamps", async () => {
    const service = new AudioCaptureService();
    const receivedFrames: AudioFrame[] = [];

    await service.startStreaming(
      (frame) => {
        receivedFrames.push(frame);
      },
      (error) => {
        throw error;
      }
    );

    // Wait slightly to capture mock frame iterations
    await new Promise((resolve) => setTimeout(resolve, 150));

    service.stopStreaming();

    expect(receivedFrames.length).toBeGreaterThan(0);
    expect(receivedFrames[0].data).toBeInstanceOf(Float32Array);
    expect(receivedFrames[0].data.length).toBe(1024);
    expect(receivedFrames[0].timestamp).toBeLessThanOrEqual(Date.now());
    expect(receivedFrames[0].audioLevel).toBeGreaterThan(0.0);
  });

  it("should handle pause and resume states correctly", async () => {
    const service = new AudioCaptureService();
    const receivedFrames: AudioFrame[] = [];

    await service.startStreaming(
      (frame) => {
        receivedFrames.push(frame);
      },
      (error) => {
        throw error;
      }
    );

    service.pauseStreaming();
    expect(service.isCapturing()).toBe(false);

    // Clear buffer list, verify frames are blocked while paused
    const frameCountBeforePause = receivedFrames.length;
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(receivedFrames.length).toBe(frameCountBeforePause);

    service.resumeStreaming();
    expect(service.isCapturing()).toBe(true);

    // Verify frames resume delivering
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(receivedFrames.length).toBeGreaterThan(frameCountBeforePause);

    service.stopStreaming();
  });
});
