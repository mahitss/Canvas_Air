import { IRendererEventBus, RendererBusEvent, RendererSubscribeOptions } from "../events";

/**
 * RendererEventBus delivers strongly-typed rendering lifecycle notifications
 * with history replay, subscriber isolation, and wildcard catch filters.
 */
export class RendererEventBus implements IRendererEventBus {
  private history: RendererBusEvent[] = [];
  private subscribers: Map<string, Set<(event: RendererBusEvent) => void>> = new Map();

  /**
   * Publishes an event to all matching registered subscribers.
   */
  public publish(event: RendererBusEvent): void {
    // Append to thread-safe history replay cache
    this.history.push({ ...event });

    // 1. Dispatch to specific event type subscribers
    const typeSubscribers = this.subscribers.get(event.type);
    if (typeSubscribers) {
      for (const cb of typeSubscribers) {
        this.safeExecute(cb, event);
      }
    }

    // 2. Dispatch to wildcard '*' subscribers
    const wildcardSubscribers = this.subscribers.get("*");
    if (wildcardSubscribers) {
      for (const cb of wildcardSubscribers) {
        this.safeExecute(cb, event);
      }
    }
  }

  /**
   * Subscribes to events of a specific type (or '*' for all events).
   * Supports replaying historical matching events.
   */
  public subscribe(
    type: RendererBusEvent["type"] | "*",
    callback: (event: RendererBusEvent) => void,
    options?: RendererSubscribeOptions
  ): () => void {
    let set = this.subscribers.get(type);
    if (!set) {
      set = new Set();
      this.subscribers.set(type, set);
    }
    set.add(callback);

    // Replay history if requested
    if (options?.replay) {
      const historicalEvents = type === "*" 
        ? this.history 
        : this.history.filter(e => e.type === type);

      for (const event of historicalEvents) {
        this.safeExecute(callback, event);
      }
    }

    // Return unsubscribe cleanup callback function
    return () => {
      const currentSet = this.subscribers.get(type);
      if (currentSet) {
        currentSet.delete(callback);
        if (currentSet.size === 0) {
          this.subscribers.delete(type);
        }
      }
    };
  }

  /**
   * Returns a copy of the event history array.
   */
  public getHistory(): RendererBusEvent[] {
    return [...this.history];
  }

  /**
   * Clears event history logs and active subscribers list.
   */
  public clear(): void {
    this.history = [];
    this.subscribers.clear();
  }

  private safeExecute(cb: (event: RendererBusEvent) => void, event: RendererBusEvent): void {
    try {
      cb(event);
    } catch (err) {
      // Subscriber error isolation: capture error without crashing the publisher context loop
      console.error("[RendererEventBusError] Subscriber threw exception during callback:", err);
    }
  }
}
