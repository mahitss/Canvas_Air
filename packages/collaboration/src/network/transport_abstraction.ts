export type TransportType = "WebSocket" | "WebRTC" | "LongPolling";

export class TransportAbstraction {
  private activeTransport: TransportType = "WebSocket";
  private isConnected = false;
  private heartbeatInterval?: any;
  private reconnectTimeout?: any;
  private backoffMs = 1000;
  private readonly listeners = new Map<string, Set<(payload: any) => void>>();

  constructor(
    private readonly config: {
      wsUrl: string;
      pingIntervalMs?: number;
      maxBackoffMs?: number;
    }
  ) {}

  public getActiveTransport(): TransportType {
    return this.activeTransport;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Initializes connection, default setup uses WebSocket and starts health heartbeats.
   */
  public async connect(): Promise<void> {
    this.isConnected = true;
    this.backoffMs = 1000; // Reset backoff
    this.startHeartbeat();
  }

  /**
   * Disconnects and cleans timers.
   */
  public disconnect(): void {
    this.isConnected = false;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }

  /**
   * Fallback logic: switches protocol mode to LongPolling / WebRTC if WebSocket errors out.
   */
  public handleConnectionError(): void {
    this.isConnected = false;
    this.stopHeartbeat();

    // Fallback switch
    if (this.activeTransport === "WebSocket") {
      this.activeTransport = "WebRTC";
    } else if (this.activeTransport === "WebRTC") {
      this.activeTransport = "LongPolling";
    }

    // Schedule auto reconnect with exponential backoff
    const maxBackoff = this.config.maxBackoffMs ?? 30000;
    this.reconnectTimeout = setTimeout(() => {
      this.backoffMs = Math.min(this.backoffMs * 2, maxBackoff);
      this.connect();
    }, this.backoffMs);
  }

  /**
   * Broadcasts events to the current channel.
   */
  public send(event: string, payload: any): void {
    if (!this.isConnected) {
      throw new Error(`TransportError: Cannot send payload, link connection offline`);
    }
    // Simulate sending
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        listener(payload);
      }
    }
  }

  public on(event: string, callback: (payload: any) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback);
    return () => {
      set?.delete(callback);
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    const interval = this.config.pingIntervalMs ?? 5000;
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        // Emit simulated ping
        this.send("ping", { timestamp: Date.now() });
      }
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }
}
