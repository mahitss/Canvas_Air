export type DocIntelEventType =
  | "ParsingStarted"
  | "ParsingCompleted"
  | "OCRCompleted"
  | "LayoutDetected"
  | "TableDetected"
  | "EntitiesExtracted"
  | "SemanticAnalysisCompleted"
  | "ProcessingFailed";

export interface DocIntelEvent {
  type: DocIntelEventType;
  payload: any;
  timestamp: number;
}

export type DocIntelSubscriber = (event: DocIntelEvent) => void;

export class DocIntelEventBus {
  private static instance: DocIntelEventBus;
  private readonly subscribers = new Map<DocIntelEventType, Set<DocIntelSubscriber>>();
  private readonly eventHistory: DocIntelEvent[] = [];

  public static getInstance(): DocIntelEventBus {
    if (!this.instance) {
      this.instance = new DocIntelEventBus();
    }
    return this.instance;
  }

  public subscribe(type: DocIntelEventType, subscriber: DocIntelSubscriber): () => void {
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

  public publish(type: DocIntelEventType, payload: any): void {
    const event: DocIntelEvent = {
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

  public getHistory(): DocIntelEvent[] {
    return this.eventHistory;
  }

  public clearHistory(): void {
    this.eventHistory.length = 0;
  }
}
