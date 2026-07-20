import { describe, it, expect, beforeEach } from "vitest";
import { MediaPipeHandTrackingProvider } from "../src/providers/mediapipe";
import { FrameData } from "@visioncanvas/camera-vision";

describe("MediaPipe Hand Tracking Provider", () => {
  let provider: MediaPipeHandTrackingProvider;
  let mockFrame: FrameData;

  beforeEach(() => {
    provider = new MediaPipeHandTrackingProvider({
      modelComplexity: 1,
      maxNumHands: 2
    });

    mockFrame = {
      id: "frame-1",
      timestamp: Date.now(),
      width: 640,
      height: 480,
      data: {} as any
    };
  });

  it("should initialize and start successfully", async () => {
    await provider.initialize();
    await provider.start();

    const hands = await provider.processFrame(mockFrame);
    expect(hands).toHaveLength(1);
    expect(hands[0]?.id).toBe("hand-mp-frame-1");
    expect(hands[0]?.type).toBe("right");
    expect(hands[0]?.timestamp).toBe(mockFrame.timestamp);

    await provider.stop();
    const stoppedHands = await provider.processFrame(mockFrame);
    expect(stoppedHands).toHaveLength(0);

    await provider.dispose();
  });

  it("should fail starting if not initialized first", async () => {
    await expect(provider.start()).rejects.toThrow(/Cannot start provider before initialization/);
  });
});
