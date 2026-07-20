import { IDrawingEventBus } from "./interfaces";

export type DrawingBusEventType =
  | "StrokeStarted"
  | "StrokeUpdated"
  | "StrokeCompleted"
  | "StrokeCancelled"
  | "LayerChanged"
  | "CanvasChanged";

export interface StrokeStartedEvent {
  type: "StrokeStarted";
  payload: { strokeId: string; layerId: string };
  timestamp: number;
}

export interface StrokeUpdatedEvent {
  type: "StrokeUpdated";
  payload: { strokeId: string; pointsCount: number };
  timestamp: number;
}

export interface StrokeCompletedEvent {
  type: "StrokeCompleted";
  payload: { strokeId: string; pointsCount: number };
  timestamp: number;
}

export interface StrokeCancelledEvent {
  type: "StrokeCancelled";
  payload: { strokeId: string };
  timestamp: number;
}

export interface LayerChangedEvent {
  type: "LayerChanged";
  payload: { activeLayerId: string | null };
  timestamp: number;
}

export interface CanvasChangedEvent {
  type: "CanvasChanged";
  payload: { strokesCount: number };
  timestamp: number;
}

export type DrawingBusEvent =
  | StrokeStartedEvent
  | StrokeUpdatedEvent
  | StrokeCompletedEvent
  | StrokeCancelledEvent
  | LayerChangedEvent
  | CanvasChangedEvent;

/**
 * Thread-safe Drawing Event Bus implementing pub/sub with event replay.
 */
export class DrawingEventBus implements IDrawingEventBus {
  private readonly subscribers: Map<
    DrawingBusEventType | "*",
    Set<(event: DrawingBusEvent) => void>
  > = new Map();

  private historyBuffer: DrawingBusEvent[] = [];
  private readonly maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Publishes an event to matching subscribers and archives it in the replay buffer.
   */
  public publish(event: DrawingBusEvent): void {
    // Append to replay history buffer
    this.historyBuffer.push({ ...event, payload: { ...event.payload } as any });
    if (this.historyBuffer.length > this.maxHistorySize) {
      this.historyBuffer.shift();
    }

    // Capture subscribers atomically to ensure safety against list mutations
    const targets = new Set<(event: DrawingBusEvent) => void>();

    // Direct matches
    const typeSubs = this.subscribers.get(event.type);
    if (typeSubs) {
      typeSubs.forEach((cb) => targets.add(cb));
    }

    // Wildcard matches
    const wildcardSubs = this.subscribers.get("*");
    if (wildcardSubs) {
      wildcardSubs.forEach((cb) => targets.add(cb));
    }

    // Dispatch in isolated try-catches to prevent subscriber errors from breaking dispatcher
    for (const callback of targets) {
      try {
        callback(event);
      } catch (err) {
        console.error(`[DrawingEventBusError] Dispatch callback execution failed:`, err);
      }
    }
  }

  /**
   * Subscribes to drawing events.
   * If `options.replay` is true, immediately replays matching historical events to this subscriber.
   */
  public subscribe(
    type: DrawingBusEventType | "*",
    callback: (event: DrawingBusEvent) => void,
    options?: { replay?: boolean }
  ): () => void {
    let set = this.subscribers.get(type);
    if (!set) {
      set = new Set();
      this.subscribers.set(type, set);
    }
    set.add(callback);

    // Replay matching past events
    if (options?.replay) {
      const matchingHistory = this.historyBuffer.filter(
        (event) => type === "*" || event.type === type
      );
      for (const event of matchingHistory) {
        try {
          callback(event);
        } catch (err) {
          console.error(`[DrawingEventBusReplayError] Callback execution failed:`, err);
        }
      }
    }

    // Return unsubscription hook
    return () => {
      const currentSet = this.subscribers.get(type);
      if (currentSet) {
        currentSet.delete(callback);
      }
    };
  }

  /**
   * Resets/clears the event replay history buffer.
   */
  public clearHistory(): void {
    this.historyBuffer = [];
  }

  /**
   * Unsubscribes all currently active event listeners.
   */
  public unsubscribeAll(): void {
    this.subscribers.clear();
  }
}

// Keep DrawingEventEmitter to preserve legacy internal coupling
export class DrawingEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  public on(event: string, callback: Function): void {
    const queue = this.listeners[event] || [];
    queue.push(callback);
    this.listeners[event] = queue;
  }

  public off(event: string, callback: Function): void {
    const queue = this.listeners[event];
    if (queue) {
      this.listeners[event] = queue.filter(cb => cb !== callback);
    }
  }

  public emit(event: string, data: any): void {
    const queue = this.listeners[event];
    if (queue) {
      for (const callback of queue) {
        try {
          callback(data);
        } catch (err) {
          console.error(`[DrawingEventError] callback failed:`, err);
        }
      }
    }
  }
}
