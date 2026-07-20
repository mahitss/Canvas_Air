import { IVfxEventBus, VfxEvent, VfxEventType } from "../events";

export class VfxEventBus implements IVfxEventBus {
  private readonly subscribers = new Map<string, Array<{
    callback: (event: VfxEvent) => void;
    replay?: boolean;
  }>>();

  private readonly history: VfxEvent[] = [];

  /**
   * Publishes an event to all matching subscribers, isolating errors.
   */
  public publish(event: VfxEvent): void {
    this.history.push(event);

    const channels = [event.type, "*"];
    for (const channel of channels) {
      const list = this.subscribers.get(channel);
      if (list) {
        // Create copy of the list to prevent concurrent modifications issues during iteration
        for (const sub of [...list]) {
          this.safeExecute(sub.callback, event);
        }
      }
    }
  }

  /**
   * Subscribes a callback to receive VFX events, supporting wildcard channels and history replays.
   */
  public subscribe(
    type: VfxEventType | "*",
    callback: (event: VfxEvent) => void,
    options?: { replay?: boolean }
  ): () => void {
    let list = this.subscribers.get(type);
    if (!list) {
      list = [];
      this.subscribers.set(type, list);
    }

    const sub: { callback: (event: VfxEvent) => void; replay?: boolean } = { callback };
    if (options?.replay !== undefined) {
      sub.replay = options.replay;
    }
    list.push(sub);

    // If replay option is selected, play back matched history events immediately
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
   * Executes subscriber callback wrapped in try-catch to prevent publisher context crash.
   */
  private safeExecute(callback: (event: VfxEvent) => void, event: VfxEvent): void {
    try {
      callback(event);
    } catch (err) {
      console.error(`[VfxEventBusError] Subscriber threw exception during callback:`, err);
    }
  }
}
export * from "../events";
