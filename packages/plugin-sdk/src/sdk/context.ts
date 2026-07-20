import { CanvasApi, StorageApi, NotificationApi } from "../types";

export class MockCanvas implements CanvasApi {
  public drawCalls: string[] = [];

  public drawCircle(x: number, y: number, radius: number): void {
    this.drawCalls.push(`circle:${x},${y},${radius}`);
  }

  public drawRect(x: number, y: number, w: number, h: number): void {
    this.drawCalls.push(`rect:${x},${y},${w},${h}`);
  }

  public clearCanvas(): void {
    this.drawCalls.push("clear");
  }
}

export class MockStorage implements StorageApi {
  private store: Map<string, string> = new Map();

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

export class MockNotifications implements NotificationApi {
  public messages: string[] = [];

  public notify(message: string): void {
    this.messages.push(message);
  }
}
export * from "../types";
