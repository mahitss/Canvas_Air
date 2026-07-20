import { NetworkTransport } from "../types";

export class MockNetworkTransport implements NetworkTransport {
  public sentEvents: { event: string; payload: any; userId?: string }[] = [];
  private callbacks: Map<string, ((payload: any) => void)[]> = new Map();

  public broadcast(event: string, payload: any): void {
    this.sentEvents.push({ event, payload });
    const list = this.callbacks.get(event);
    if (list) {
      for (const cb of list) {
        cb(payload);
      }
    }
  }

  public sendTo(userId: string, event: string, payload: any): void {
    this.sentEvents.push({ event, payload, userId });
  }

  public on(event: string, callback: (payload: any) => void): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }
}
export * from "../types";
export * from "../config";
