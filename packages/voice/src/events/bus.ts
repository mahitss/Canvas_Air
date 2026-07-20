import { IVoiceEventBus, VoiceSubscribeOptions } from "../interfaces";
import { VoiceBusEvent, VoiceBusEventType } from "../events";

type SubscriberCallback = (event: VoiceBusEvent) => void;

interface Subscriber {
  type: VoiceBusEventType | "*";
  callback: SubscriberCallback;
}

/**
 * VoiceEventBus coordinates thread-safe, crash-isolated voice events publishing,
 * supporting wildcard '*' subscriptions and event replay mechanisms.
 */
export class VoiceEventBus implements IVoiceEventBus {
  private subscribers: Set<Subscriber> = new Set();
  private history: VoiceBusEvent[] = [];
  private maxHistorySize = 500;

  /**
   * Publishes an event to all matching subscribers asynchronously to prevent thread blocking.
   */
  public publish(event: VoiceBusEvent): void {
    // Save to history log
    this.history.push(event);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Capture a snapshot of subscribers to prevent concurrent modification issues
    const activeSubscribers = Array.from(this.subscribers);

    for (const sub of activeSubscribers) {
      if (sub.type === "*" || sub.type === event.type) {
        // Asynchronous non-blocking dispatch
        setTimeout(() => {
          try {
            sub.callback(event);
          } catch (err) {
            console.error(
              `[VoiceEventBusError] Dispatch callback execution failed: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        }, 0);
      }
    }
  }

  /**
   * Subscribes a callback to a specific voice event type or wildcard.
   * If options.replay is true, immediately dispatches matching past events.
   */
  public subscribe(
    type: VoiceBusEventType | "*",
    callback: SubscriberCallback,
    options?: VoiceSubscribeOptions
  ): () => void {
    const subscriber: Subscriber = { type, callback };
    this.subscribers.add(subscriber);

    // Replay historical events if requested
    if (options?.replay) {
      const matchingEvents = this.history.filter(
        e => type === "*" || e.type === type
      );
      
      for (const event of matchingEvents) {
        try {
          callback(event);
        } catch (err) {
          console.error(
            `[VoiceEventBusError] Replay callback execution failed: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    }

    // Return unsubscribe clean method
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  public getHistory(): VoiceBusEvent[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }

  public unsubscribeAll(): void {
    this.subscribers.clear();
  }
}
