import { IVoiceEventBus } from "../interfaces";

/**
 * Minimal decoupled platform event bus contract.
 * Decouples the voice command engine from the downstream core/framework dependencies at compile time.
 */
export interface IMinimalPlatformEventBus {
  publish(event: { type: string; payload: any; timestamp: number }): void;
}

/**
 * Integration Bridge coordinating command dispatches from the Voice Event Bus
 * and publishing them onto the global Platform Event Bus asynchronously.
 */
export class VoicePlatformBridge {
  private unsubscriber: (() => void) | null = null;

  constructor(
    private readonly voiceEventBus: IVoiceEventBus,
    private readonly platformEventBus: IMinimalPlatformEventBus
  ) {}

  /**
   * Starts listening to voice events to forward them as platform level actions.
   */
  public start(): void {
    if (this.unsubscriber) {
      return;
    }

    this.unsubscriber = this.voiceEventBus.subscribe("CommandParsed", (event: any) => {
      const commandResult = event.payload.result;

      // Asynchronous non-blocking microtask dispatch to preserve modular boundaries
      Promise.resolve().then(() => {
        try {
          this.platformEventBus.publish({
            type: "PLATFORM_VOICE_COMMAND",
            payload: {
              intent: commandResult.intent,
              entities: commandResult.entities,
              rawTranscript: commandResult.rawTranscript,
              confidence: commandResult.confidence,
              executionTimeMs: commandResult.executionTimeMs
            },
            timestamp: Date.now()
          });
        } catch (err) {
          console.error(
            `[VoicePlatformBridgeError] Failed to publish voice command: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      });
    });
  }

  /**
   * Stops forwarding updates and unsubscribes from the voice bus.
   */
  public stop(): void {
    if (this.unsubscriber) {
      this.unsubscriber();
      this.unsubscriber = null;
    }
  }

  public isRunning(): boolean {
    return this.unsubscriber !== null;
  }
}
