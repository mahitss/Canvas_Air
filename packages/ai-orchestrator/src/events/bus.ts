import { IAiOrchestratorEventBus } from "../interfaces";
import { AiEvent, AiEventType } from "../events";

export class AiOrchestratorEventBus implements IAiOrchestratorEventBus {
  private readonly subscribers = new Map<string, Array<{
    callback: (event: AiEvent) => void;
    replay?: boolean;
  }>>();

  private readonly history: AiEvent[] = [];

  /**
   * Publishes an AI event to all matching subscribers, isolating subscriber exceptions.
   */
  public publish(event: AiEvent): void {
    this.history.push(event);

    const channels = [event.type, "*"];
    for (const channel of channels) {
      const list = this.subscribers.get(channel);
      if (list) {
        // Copy callbacks list to prevent concurrent modification errors
        for (const sub of [...list]) {
          this.safeExecute(sub.callback, event);
        }
      }
    }
  }

  /**
   * Subscribes a callback to receive AI events, supporting wildcard channels and history replays.
   */
  public subscribe(
    type: AiEventType | "*",
    callback: (event: AiEvent) => void,
    options?: { replay?: boolean }
  ): () => void {
    let list = this.subscribers.get(type);
    if (!list) {
      list = [];
      this.subscribers.set(type, list);
    }

    const sub: { callback: (event: AiEvent) => void; replay?: boolean } = { callback };
    if (options?.replay !== undefined) {
      sub.replay = options.replay;
    }
    list.push(sub);

    // Synchronously replay history events matching target criteria
    if (options?.replay) {
      for (const event of this.history) {
        if (type === "*" || event.type === type) {
          this.safeExecute(callback, event);
        }
      }
    }

    // Return unsubscribe function
    return () => {
      const currentList = this.subscribers.get(type);
      if (currentList) {
        const idx = currentList.findIndex(item => item.callback === callback);
        if (idx !== -1) {
          currentList.splice(idx, 1);
        }
      }
    };
  }

  /**
   * Clears the event history cache.
   */
  public clearHistory(): void {
    this.history.length = 0;
  }

  /**
   * Safely executes a callback to prevent publisher context crashes.
   */
  private safeExecute(callback: (event: AiEvent) => void, event: AiEvent): void {
    try {
      callback(event);
    } catch (err) {
      console.error(`[AiEventBusError] Subscriber threw exception during callback:`, err);
    }
  }
}
