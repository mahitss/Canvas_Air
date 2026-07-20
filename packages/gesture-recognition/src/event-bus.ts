import { IGestureEventBus } from "./interfaces";
import { GestureBusEvent, GestureEventType } from "./types";

/**
 * Thread-safe Gesture Event Bus implementing pub/sub with event replay.
 */
export class GestureEventBus implements IGestureEventBus {
  private readonly subscribers: Map<
    GestureEventType | "*",
    Set<(event: GestureBusEvent) => void>
  > = new Map();

  private historyBuffer: GestureBusEvent[] = [];
  private readonly maxHistorySize: number;

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Publishes an event to matching subscribers and archives it in the replay buffer.
   */
  public publish(event: GestureBusEvent): void {
    // Append to replay history buffer
    this.historyBuffer.push({ ...event, payload: { ...event.payload } });
    if (this.historyBuffer.length > this.maxHistorySize) {
      this.historyBuffer.shift();
    }

    // Capture subscribers atomically to ensure thread-safety against list mutations
    const targets = new Set<(event: GestureBusEvent) => void>();

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

    // Dispatch asynchronously or in isolated try-catches to prevent subscriber errors from breaking dispatcher
    for (const callback of targets) {
      try {
        callback(event);
      } catch (err) {
        // Safe isolation: suppress error logs to keep main tracking pipeline alive
      }
    }
  }

  /**
   * Subscribes to gesture events.
   * If `options.replay` is true, immediately replays matching historical events to this subscriber.
   */
  public subscribe(
    type: GestureEventType | "*",
    callback: (event: GestureBusEvent) => void,
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
        } catch {
          // Safe isolation
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
