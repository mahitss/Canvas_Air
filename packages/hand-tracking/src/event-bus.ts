import { IHandTrackingEventBus } from "./interfaces";
import { HandTrackingEvent } from "./types";

/**
 * Production-quality, strongly-typed Event Bus for Hand Tracking events.
 * Implements callback isolation protection to ensure dispatch robustness.
 */
export class HandTrackingEventBus implements IHandTrackingEventBus {
  private listeners: Map<string, Set<(event: any) => void>> = new Map();

  public publish(event: HandTrackingEvent): void {
    const typeListeners = this.listeners.get(event.type);
    if (!typeListeners || typeListeners.size === 0) {
      return;
    }

    // Copy to prevent mutation issues during dispatch cycles
    const targets = Array.from(typeListeners);

    targets.forEach((callback) => {
      try {
        callback(event);
      } catch {
        // Suppress target exception to ensure other callbacks execute cleanly
      }
    });
  }

  public subscribe<T extends HandTrackingEvent["type"]>(
    type: T,
    callback: (event: Extract<HandTrackingEvent, { type: T }>) => void
  ): () => void {
    let typeListeners = this.listeners.get(type);
    if (!typeListeners) {
      typeListeners = new Set();
      this.listeners.set(type, typeListeners);
    }

    typeListeners.add(callback);

    return () => {
      const currentListeners = this.listeners.get(type);
      if (currentListeners) {
        currentListeners.delete(callback);
        if (currentListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  public clear(): void {
    this.listeners.clear();
  }
}
