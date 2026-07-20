export interface EventBridgeEnvelope<T = any> {
  channel: string;
  payload: T;
  senderId: string;
  timestamp: number;
}

export class PluginEventBridge {
  private readonly listeners = new Map<string, Set<(envelope: EventBridgeEnvelope) => void>>();
  private readonly requestHandlers = new Map<string, (payload: any, senderId: string) => Promise<any> | any>();

  /**
   * Publishes an event payload to all channel subscribers.
   */
  public publish<T>(channel: string, payload: T, senderId: string): void {
    const envelope: EventBridgeEnvelope<T> = {
      channel,
      payload,
      senderId,
      timestamp: Date.now()
    };

    const channels = [channel, "*"];
    for (const ch of channels) {
      const set = this.listeners.get(ch);
      if (set) {
        for (const callback of set) {
          try {
            callback(envelope);
          } catch (err) {
            console.error(`[EventBridgeError] Subscriber crash on channel ${ch}:`, err);
          }
        }
      }
    }
  }

  /**
   * Subscribes a callback listener to events published on target channel (supports '*' wildcards).
   */
  public subscribe(
    channel: string,
    callback: (envelope: EventBridgeEnvelope) => void
  ): () => void {
    let set = this.listeners.get(channel);
    if (!set) {
      set = new Set();
      this.listeners.set(channel, set);
    }
    set.add(callback);
    return () => {
      set?.delete(callback);
    };
  }

  /**
   * Registers a single request handler callback for Request-Response patterns.
   */
  public registerRequestHandler<TReq, TRes>(
    channel: string,
    handler: (payload: TReq, senderId: string) => Promise<TRes> | TRes
  ): () => void {
    if (this.requestHandlers.has(channel)) {
      throw new Error(`DuplicateRequestHandlerError: Handler already registered for channel: ${channel}`);
    }
    this.requestHandlers.set(channel, handler);
    return () => {
      this.requestHandlers.delete(channel);
    };
  }

  /**
   * Dispatches a Request to target channel, returning a Promise that resolves with the response.
   */
  public async request<TReq, TRes>(channel: string, payload: TReq, senderId: string): Promise<TRes> {
    const handler = this.requestHandlers.get(channel);
    if (!handler) {
      throw new Error(`NoRequestHandlerError: No request handler registered for channel: ${channel}`);
    }
    return handler(payload, senderId);
  }
}
