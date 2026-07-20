import { SpatialEventType } from "../events";

export interface SpatialEvent {
  type: SpatialEventType;
  payload: any;
  timestamp: number;
}


export type SpatialSubscriber = (event: SpatialEvent) => void;

export class SpatialEventBus {
  private static instance: SpatialEventBus;
  private readonly subscribers = new Map<SpatialEventType, Set<SpatialSubscriber>>();
  private readonly eventHistory: SpatialEvent[] = [];

  public static getInstance(): SpatialEventBus {
    if (!this.instance) {
      this.instance = new SpatialEventBus();
    }
    return this.instance;
  }

  public subscribe(type: SpatialEventType, subscriber: SpatialSubscriber): () => void {
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

  public publish(type: SpatialEventType, payload: any): void {
    const event: SpatialEvent = {
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

  public getHistory(): SpatialEvent[] {
    return this.eventHistory;
  }

  public clearHistory(): void {
    this.eventHistory.length = 0;
  }
}
