export type ImageEventType =
  | "GenerationRequested"
  | "GenerationStarted"
  | "ProgressUpdated"
  | "GenerationCompleted"
  | "GenerationCancelled"
  | "GenerationFailed";

export interface SketchImageEvent {
  type: ImageEventType;
  payload: any;
  timestamp: number;
}

export type ImageEventSubscriber = (event: SketchImageEvent) => void;

export class ImageEventBus {
  private static instance: ImageEventBus;
  private readonly subscribers = new Map<ImageEventType, Set<ImageEventSubscriber>>();
  private readonly eventHistory: SketchImageEvent[] = [];
  private isDispatching = false;
  private readonly dispatchQueue: (() => void)[] = [];

  public static getInstance(): ImageEventBus {
    if (!this.instance) {
      this.instance = new ImageEventBus();
    }
    return this.instance;
  }

  public subscribe(type: ImageEventType, subscriber: ImageEventSubscriber): () => void {
    let set = this.subscribers.get(type);
    if (!set) {
      set = new Set();
      this.subscribers.set(type, set);
    }
    set.add(subscriber);

    return () => {
      set?.delete(subscriber);
    };
  }

  /**
   * Thread-safe sequential dispatch using a task queue.
   */
  public publish(type: ImageEventType, payload: any): void {
    const event: SketchImageEvent = {
      type,
      payload,
      timestamp: Date.now()
    };

    // Record for Event Replay
    this.eventHistory.push(event);

    this.dispatchQueue.push(() => {
      const set = this.subscribers.get(type);
      if (set) {
        for (const sub of set) {
          try {
            sub(event);
          } catch {
            // ignore subscriber errors
          }
        }
      }
    });

    this.flushQueue();
  }

  /**
   * Event Replay: replays recorded logs since a specified start timestamp.
   */
  public getReplayHistory(sinceTimestamp = 0): SketchImageEvent[] {
    return this.eventHistory.filter((e) => e.timestamp >= sinceTimestamp);
  }

  public clearHistory(): void {
    this.eventHistory.length = 0;
  }

  private flushQueue(): void {
    if (this.isDispatching) return;
    this.isDispatching = true;

    while (this.dispatchQueue.length > 0) {
      const task = this.dispatchQueue.shift();
      if (task) {
        try {
          task();
        } catch {
          // ignore task errors
        }
      }
    }

    this.isDispatching = false;
  }
}
export * from "./interfaces";
export * from "./domain";
