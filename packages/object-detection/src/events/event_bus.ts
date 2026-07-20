export type SceneEventType =
  | "DetectionStarted"
  | "DetectionCompleted"
  | "ObjectsTracked"
  | "SceneClassified"
  | "SegmentationCompleted"
  | "SpatialAnalysisCompleted"
  | "ProcessingFailed";

export interface SceneEvent {
  type: SceneEventType;
  payload: any;
  timestamp: number;
}

export type SceneSubscriber = (event: SceneEvent) => void;

export class SceneEventBus {
  private static instance: SceneEventBus;
  private readonly subscribers = new Map<SceneEventType, Set<SceneSubscriber>>();
  private readonly eventHistory: SceneEvent[] = [];

  public static getInstance(): SceneEventBus {
    if (!this.instance) {
      this.instance = new SceneEventBus();
    }
    return this.instance;
  }

  public subscribe(type: SceneEventType, subscriber: SceneSubscriber): () => void {
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

  public publish(type: SceneEventType, payload: any): void {
    const event: SceneEvent = {
      type,
      payload,
      timestamp: Date.now()
    };

    this.eventHistory.push(event);

    const set = this.subscribers.get(type);
    if (set) {
      for (const sub of set) {
        try {
          sub(event);
        } catch {
          // ignore subscriber exceptions
        }
      }
    }
  }

  public getHistory(): SceneEvent[] {
    return this.eventHistory;
  }

  public clearHistory(): void {
    this.eventHistory.length = 0;
  }
}
