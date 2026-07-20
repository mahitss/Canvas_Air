import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FrameScheduler } from "../src/scheduler";
import { FrameData } from "../src/types";

describe("Frame Scheduler Service", () => {
  let scheduler: FrameScheduler;
  let mockFrame1: FrameData;
  let mockFrame2: FrameData;

  beforeEach(() => {
    scheduler = new FrameScheduler();

    mockFrame1 = {
      id: "frame-1",
      timestamp: Date.now(),
      width: 640,
      height: 480,
      data: {} as ImageData
    };

    mockFrame2 = {
      id: "frame-2",
      timestamp: Date.now(),
      width: 640,
      height: 480,
      data: {} as ImageData
    };
  });

  afterEach(() => {
    scheduler.stop();
    vi.clearAllMocks();
  });

  it("should dispatch frames to registered consumers", () => {
    const consumerSpy = vi.fn();
    scheduler.registerConsumer(consumerSpy);

    scheduler.scheduleFrame(mockFrame1);

    expect(consumerSpy).toHaveBeenCalledWith(mockFrame1);
  });

  it("should avoid duplicate processing of the same frame ID", () => {
    const consumerSpy = vi.fn();
    scheduler.registerConsumer(consumerSpy);

    scheduler.scheduleFrame(mockFrame1);
    scheduler.scheduleFrame(mockFrame1); // Duplicate ID

    expect(consumerSpy).toHaveBeenCalledTimes(1);
  });

  it("should adaptively scale down FPS if consumer processing latency is high", async () => {
    scheduler.setTargetFPS(60);
    expect(scheduler.getAdaptiveFPS()).toBe(60);

    // Register consumer that simulates slow async processing of 100ms
    scheduler.registerConsumer(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    scheduler.scheduleFrame(mockFrame1);

    // Wait for the consumer to finish processing
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Force adaptive step update
    scheduler.scheduleFrame(mockFrame2);

    expect(scheduler.getAdaptiveFPS()).toBeLessThan(60);
  });

  it("should prevent frame starvation when active process exceeds starvation timeout", async () => {
    const consumerSpy = vi.fn();
    scheduler.registerConsumer(consumerSpy);

    // Manually force processing state to mock slow consumer locking the queue
    scheduler.scheduleFrame(mockFrame1);

    // Simulate scheduling next frame immediately - should get blocked
    scheduler.scheduleFrame(mockFrame2);
    expect(consumerSpy).toHaveBeenCalledTimes(1);

    // Mock starvation threshold trigger: advance time by 1100ms
    vi.useFakeTimers();
    vi.advanceTimersByTime(1100);

    // Try scheduling again - should bypass backpressure to avoid starvation
    scheduler.scheduleFrame(mockFrame2);
    expect(consumerSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
