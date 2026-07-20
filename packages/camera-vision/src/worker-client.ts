import { ICameraWorkerClient } from "./interfaces";
import { FrameData } from "./types";

/**
 * Production-quality Camera Background Worker Client.
 * Manages Web Worker lifecycles, zero-copy buffer transfers, acknowledgments, and retry mechanisms.
 */
export class CameraWorkerClient implements ICameraWorkerClient {
  private worker: Worker | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  // Queue tracking pending acknowledgments: map of frameId -> { resolve, reject, timeoutId, retryCount, frame }
  private pendingAcks: Map<
    string,
    {
      resolve: () => void;
      reject: (err: Error) => void;
      timeoutId: any;
      retryCount: number;
      frame: FrameData;
    }
  > = new Map();

  private readonly ackTimeoutMs = 300;
  private readonly maxRetries = 3;

  constructor(private readonly workerScriptUrl: string) {
    this.initWorker();
  }

  public async postFrame(frame: FrameData): Promise<void> {
    if (!this.worker) {
      throw new Error("Worker client is not initialized.");
    }

    return new Promise<void>((resolve, reject) => {
      this.pendingAcks.set(frame.id, {
        resolve,
        reject,
        timeoutId: null,
        retryCount: 0,
        frame
      });

      this.sendWithRetry(frame.id);
    });
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Clear all pending timeouts and reject promises
    this.pendingAcks.forEach((item) => {
      if (item.timeoutId) {
        clearTimeout(item.timeoutId);
      }
      item.reject(new Error("Worker was terminated."));
    });
    this.pendingAcks.clear();
  }

  public onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  private initWorker(): void {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return;
    }

    try {
      this.worker = new Worker(this.workerScriptUrl);

      this.worker.onmessage = (event: MessageEvent) => {
        const { type, id, error } = event.data;
        if (type === "ACK" || type === "DONE") {
          const item = this.pendingAcks.get(id);
          if (item) {
            if (item.timeoutId) {
              clearTimeout(item.timeoutId);
            }
            this.pendingAcks.delete(id);
            item.resolve();
          }
        } else if (type === "ERROR") {
          const item = this.pendingAcks.get(id);
          if (item) {
            if (item.timeoutId) {
              clearTimeout(item.timeoutId);
            }
            this.pendingAcks.delete(id);
            item.reject(new Error(error || "Worker processing failed."));
          }
          if (this.errorCallback) {
            this.errorCallback(new Error(error || "Worker processing error event."));
          }
        }
      };

      this.worker.onerror = (err) => {
        const errorObj = new Error(err.message || "Background worker encountered an unhandled exception.");
        if (this.errorCallback) {
          this.errorCallback(errorObj);
        }
        // Fail all pending frames on crash
        this.pendingAcks.forEach((item) => {
          if (item.timeoutId) {
            clearTimeout(item.timeoutId);
          }
          item.reject(errorObj);
        });
        this.pendingAcks.clear();
      };
    } catch (e) {
      const errorObj = e instanceof Error ? e : new Error(String(e));
      if (this.errorCallback) {
        this.errorCallback(errorObj);
      }
    }
  }

  private sendWithRetry(frameId: string): void {
    const item = this.pendingAcks.get(frameId);
    if (!item) {
      return;
    }

    if (!this.worker) {
      item.reject(new Error("Worker connection lost."));
      this.pendingAcks.delete(frameId);
      return;
    }

    try {
      const buffer = item.frame.data.data ? item.frame.data.data.buffer : null;

      // Transferable list for zero-copy if buffer is defined
      if (buffer) {
        this.worker.postMessage(
          {
            type: "PROCESS_FRAME",
            id: item.frame.id,
            timestamp: item.frame.timestamp,
            width: item.frame.width,
            height: item.frame.height,
            buffer: buffer
          },
          [buffer]
        );
      } else {
        // Fallback for mock structures
        this.worker.postMessage({
          type: "PROCESS_FRAME",
          id: item.frame.id,
          timestamp: item.frame.timestamp,
          width: item.frame.width,
          height: item.frame.height
        });
      }

      // Schedule ACK timeout watch
      if (this.pendingAcks.has(frameId)) {
        item.timeoutId = setTimeout(() => {
          this.handleTimeout(frameId);
        }, this.ackTimeoutMs);
      }
    } catch (err) {
      this.handleTimeout(frameId);
    }
  }

  private handleTimeout(frameId: string): void {
    const item = this.pendingAcks.get(frameId);
    if (!item) {
      return;
    }

    if (item.timeoutId) {
      clearTimeout(item.timeoutId);
      item.timeoutId = null;
    }

    if (item.retryCount < this.maxRetries) {
      item.retryCount++;
      this.sendWithRetry(frameId);
    } else {
      item.reject(new Error(`Worker message timeout. Failed after ${this.maxRetries} retries.`));
      this.pendingAcks.delete(frameId);
    }
  }
}
