import { IHandwritingEventBus } from "../interfaces";
import { HandwritingBusEvent, HandwritingBusEventType } from "../events";

type SubscriptionCallback = (event: HandwritingBusEvent) => void;

interface Subscription {
  id: string;
  type: HandwritingBusEventType | "*";
  callback: SubscriptionCallback;
}

/**
 * Thread-safe, strongly-typed event bus implementation for handwriting recognition events.
 * Features subscriber crash isolation and event replay support.
 */
export class HandwritingEventBus implements IHandwritingEventBus {
  private subscriptions: Map<string, Subscription> = new Map();
  private history: HandwritingBusEvent[] = [];
  private subscriptionIdCounter = 0;

  /**
   * Publishes an event to matching subscribers and logs it in the history cache.
   */
  public publish(event: HandwritingBusEvent): void {
    // Save to event history
    this.history.push(event);

    // Collect all matching subscriptions
    const matches: Subscription[] = [];
    for (const sub of this.subscriptions.values()) {
      if (sub.type === "*" || sub.type === event.type) {
        matches.push(sub);
      }
    }

    // Safely dispatch to each subscriber in isolated try-catch boundaries
    for (const match of matches) {
      try {
        match.callback(event);
      } catch (error) {
        console.error(
          `[HandwritingEventBusError] Dispatch callback execution failed:`,
          error
        );
      }
    }
  }

  /**
   * Subscribes to events. Supports replaying historical events.
   */
  public subscribe(
    type: HandwritingBusEventType | "*",
    callback: SubscriptionCallback,
    options?: { replay?: boolean }
  ): () => void {
    const id = `sub_${++this.subscriptionIdCounter}`;
    this.subscriptions.set(id, { id, type, callback });

    // Handle historical event replay if requested
    if (options?.replay) {
      const pastEvents = this.history.filter(
        event => type === "*" || event.type === type
      );
      for (const event of pastEvents) {
        try {
          callback(event);
        } catch (error) {
          console.error(
            `[HandwritingEventBusError] Replay callback execution failed:`,
            error
          );
        }
      }
    }

    // Return unsubscriber function
    return () => {
      this.subscriptions.delete(id);
    };
  }

  /**
   * Clears historical events cache.
   */
  public clearHistory(): void {
    this.history = [];
  }

  /**
   * Unsubscribes all active event listeners.
   */
  public unsubscribeAll(): void {
    this.subscriptions.clear();
  }
}
