export type SketchEventType =
  | "RecognitionStarted"
  | "DiagramDetected"
  | "DiagramGenerated"
  | "LayoutUpdated"
  | "GenerationFailed"
  | "SketchParsed"
  | "DiagramClassified"
  | "RelationshipsAnalyzed";

export interface SketchDiagramEvent {
  type: SketchEventType;
  payload: any;
  timestamp: number;
}

export type EventSubscriber = (event: SketchDiagramEvent) => void;

export class DiagramEventBus {
  private static instance: DiagramEventBus;
  private readonly subscribers = new Map<SketchEventType, Set<EventSubscriber>>();

  public static getInstance(): DiagramEventBus {
    if (!this.instance) {
      this.instance = new DiagramEventBus();
    }
    return this.instance;
  }

  public subscribe(type: SketchEventType, subscriber: EventSubscriber): () => void {
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

  public publish(type: SketchEventType, payload: any): void {
    const event: SketchDiagramEvent = {
      type,
      payload,
      timestamp: Date.now()
    };

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
  }
}
