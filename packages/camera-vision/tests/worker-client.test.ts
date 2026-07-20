import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CameraWorkerClient } from "../src/worker-client";
import { FrameData } from "../src/types";

describe("Camera Background Worker Client", () => {
  let workerClient: CameraWorkerClient;
  let mockPostMessage: any;
  let mockTerminate: any;
  let activeWorkerInstance: any;

  beforeEach(() => {
    mockPostMessage = vi.fn();
    mockTerminate = vi.fn();

    class MockWorker {
      public onmessage: any = null;
      public onerror: any = null;
      public postMessage = mockPostMessage;
      public terminate = mockTerminate;

      constructor() {
        activeWorkerInstance = this;
      }
    }

    vi.stubGlobal("window", {});
    vi.stubGlobal("Worker", MockWorker);

    workerClient = new CameraWorkerClient("mock-worker.js");
  });

  afterEach(() => {
    workerClient.terminate();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should post frame to Web Worker with transferable buffer list", async () => {
    const buffer = new ArrayBuffer(10);
    const mockFrame: FrameData = {
      id: "frame-1",
      timestamp: 12345,
      width: 640,
      height: 480,
      data: {
        data: {
          buffer: buffer
        }
      } as any
    };

    const postPromise = workerClient.postFrame(mockFrame);

    // Verify it sent postMessage with the buffer in transferables list
    expect(mockPostMessage).toHaveBeenCalledWith(
      {
        type: "PROCESS_FRAME",
        id: "frame-1",
        timestamp: 12345,
        width: 640,
        height: 480,
        buffer: buffer
      },
      [buffer]
    );

    // Simulate worker sending ACK confirmation back
    activeWorkerInstance.onmessage({
      data: { type: "ACK", id: "frame-1" }
    });

    await expect(postPromise).resolves.toBeUndefined();
  });

  it("should retry postFrame dispatches if ACK times out", async () => {
    vi.useFakeTimers();

    const mockFrame: FrameData = {
      id: "frame-1",
      timestamp: 12345,
      width: 640,
      height: 480,
      data: {} as any
    };

    const postPromise = workerClient.postFrame(mockFrame);
    postPromise.catch(() => {});

    // Advance time to trigger first timeout retry
    await vi.advanceTimersByTimeAsync(350);
    expect(mockPostMessage).toHaveBeenCalledTimes(2);

    // Advance time to trigger second timeout retry
    await vi.advanceTimersByTimeAsync(350);
    expect(mockPostMessage).toHaveBeenCalledTimes(3);

    // Advance time to trigger third timeout retry
    await vi.advanceTimersByTimeAsync(350);
    expect(mockPostMessage).toHaveBeenCalledTimes(4);

    // Advance one more time to exceed maxRetries and trigger failure
    await vi.advanceTimersByTimeAsync(350);

    await expect(postPromise).rejects.toThrow(/Worker message timeout/);

    vi.useRealTimers();
  });

  it("should propagate worker unhandled errors to the client registered callbacks", () => {
    const errorSpy = vi.fn();
    workerClient.onError(errorSpy);

    activeWorkerInstance.onerror({
      message: "Runtime compile error"
    });

    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(errorSpy.mock.calls[0][0].message).toBe("Runtime compile error");
  });
});
