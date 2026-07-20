import { ShapePrediction, ShapeType } from "./types";

export type ShapeRecognitionEventType =
  | "ShapeDetected"
  | "ShapeUpdated"
  | "ShapeRejected"
  | "RecognitionCompleted"
  | "RecognitionFailed";

export interface ShapeDetectedEvent {
  type: "ShapeDetected";
  payload: { strokeId: string; shapeType: ShapeType; confidence: number };
  timestamp: number;
}

export interface ShapeUpdatedEvent {
  type: "ShapeUpdated";
  payload: { strokeId: string; shapeType: ShapeType; confidence: number; pointsCount: number };
  timestamp: number;
}

export interface ShapeRejectedEvent {
  type: "ShapeRejected";
  payload: { strokeId: string; shapeType: ShapeType; confidence: number; reason: string };
  timestamp: number;
}

export interface RecognitionCompletedEvent {
  type: "RecognitionCompleted";
  payload: { strokeId: string; prediction: ShapePrediction };
  timestamp: number;
}

export interface RecognitionFailedEvent {
  type: "RecognitionFailed";
  payload: { strokeId: string; reason: string };
  timestamp: number;
}

export type ShapeRecognitionEvent =
  | ShapeDetectedEvent
  | ShapeUpdatedEvent
  | ShapeRejectedEvent
  | RecognitionCompletedEvent
  | RecognitionFailedEvent;

export interface IShapeRecognitionEventBus {
  publish(event: ShapeRecognitionEvent): void;
  subscribe(
    type: ShapeRecognitionEventType | "*",
    callback: (event: ShapeRecognitionEvent) => void,
    options?: { replay?: boolean }
  ): () => void;
  clearHistory(): void;
  unsubscribeAll(): void;
}

/**
 * Event bus for Shape Recognition events with replay and error-isolated callback dispatch.
 */
export class ShapeRecognitionEventBus implements IShapeRecognitionEventBus {
  private readonly subscribers: Map<
    ShapeRecognitionEventType | "*",
    Set<(event: ShapeRecognitionEvent) => void>
  > = new Map();

  private historyBuffer: ShapeRecognitionEvent[] = [];
  private readonly maxHistorySize: number;

  constructor(maxHistorySize = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Publishes an event to matching subscribers and stores it in the replay buffer.
   */
  public publish(event: ShapeRecognitionEvent): void {
    // Save to history buffer
    this.historyBuffer.push({ ...event, payload: { ...event.payload } as any });
    if (this.historyBuffer.length > this.maxHistorySize) {
      this.historyBuffer.shift();
    }

    // Capture subscribers atomically
    const targets = new Set<(event: ShapeRecognitionEvent) => void>();

    const typeSubs = this.subscribers.get(event.type);
    if (typeSubs) {
      typeSubs.forEach(cb => targets.add(cb));
    }

    const wildcardSubs = this.subscribers.get("*");
    if (wildcardSubs) {
      wildcardSubs.forEach(cb => targets.add(cb));
    }

    // Isolated dispatch
    for (const callback of targets) {
      try {
        callback(event);
      } catch (err) {
        console.error(`[ShapeRecognitionEventBusError] Dispatch callback execution failed:`, err);
      }
    }
  }

  /**
   * Subscribes to events with optional historical event replay.
   */
  public subscribe(
    type: ShapeRecognitionEventType | "*",
    callback: (event: ShapeRecognitionEvent) => void,
    options?: { replay?: boolean }
  ): () => void {
    let set = this.subscribers.get(type);
    if (!set) {
      set = new Set();
      this.subscribers.set(type, set);
    }
    set.add(callback);

    if (options?.replay) {
      const matchingHistory = this.historyBuffer.filter(
        event => type === "*" || event.type === type
      );
      for (const event of matchingHistory) {
        try {
          callback(event);
        } catch (err) {
          console.error(`[ShapeRecognitionEventBusReplayError] Callback execution failed:`, err);
        }
      }
    }

    return () => {
      const currentSet = this.subscribers.get(type);
      if (currentSet) {
        currentSet.delete(callback);
      }
    };
  }

  /**
   * Clears the historical replay buffer.
   */
  public clearHistory(): void {
    this.historyBuffer = [];
  }

  /**
   * Unsubscribes all listeners.
   */
  public unsubscribeAll(): void {
    this.subscribers.clear();
  }
}
