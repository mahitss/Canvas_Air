import { HandPresence } from "@visioncanvas/hand-tracking";
import { IGestureProvider, IGestureLifecycleTracker, IGestureRecognitionEngine } from "./interfaces";
import { GesturePresence, GestureEvent } from "./types";

/**
 * Stub implementation of Gesture Provider.
 */
export class GestureProvider implements IGestureProvider {
  public readonly name = "StubGestureProvider";

  public async detect(_hand: HandPresence): Promise<GesturePresence | null> {
    // No implementation logic as requested
    return null;
  }
}

/**
 * Stub implementation of Gesture Lifecycle Tracker.
 */
export class GestureLifecycleTracker implements IGestureLifecycleTracker {
  public track(_handId: string, _current: GesturePresence | null, _timestamp: number): GesturePresence[] {
    // No implementation logic as requested
    return [];
  }
}

/**
 * Stub implementation of Gesture Recognition Engine.
 */
export class GestureRecognitionEngine implements IGestureRecognitionEngine {
  private readonly providers: Set<IGestureProvider> = new Set();
  private readonly subscribers: Set<(event: GestureEvent) => void> = new Set();

  constructor(
    private readonly lifecycleTracker: IGestureLifecycleTracker
  ) {}

  public registerProvider(provider: IGestureProvider): void {
    this.providers.add(provider);
  }

  public async processHand(hand: HandPresence): Promise<void> {
    // Traverse providers
    for (const provider of this.providers) {
      const detected = await provider.detect(hand);
      if (detected) {
        const events = this.lifecycleTracker.track(hand.id, detected, hand.timestamp);
        for (const evt of events) {
          if (evt.state === "started") {
            this.emit({
              type: "GestureStarted",
              payload: { gesture: evt }
            });
          } else {
            this.emit({
              type: "GestureActive",
              payload: { gesture: evt }
            });
          }
        }
        break; // Priority first match
      }
    }
  }

  public subscribe(callback: (event: GestureEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public unsubscribeAll(): void {
    this.subscribers.clear();
  }

  private emit(event: GestureEvent): void {
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch {
        // Suppress callback failures
      }
    }
  }
}
