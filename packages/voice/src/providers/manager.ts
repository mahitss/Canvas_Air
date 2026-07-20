import { ISpeechRecognitionProvider, SpeechProviderMetadata, SpeechProviderHealth } from "./interfaces";
import { SpeechTranscript } from "../types";

/**
 * Speech Recognition Provider Manager coordinating hot-swappable Offline, Cloud, and Browser Speech providers.
 * Supports hot-swapping active providers with automatic subscription transfers.
 */
export class SpeechProviderManager {
  private providers: Map<string, ISpeechRecognitionProvider> = new Map();
  private activeProviderId: string | null = null;
  
  // Track active listening subscription to support automatic hot-swap transitions
  private activeListener: {
    onResult: (result: SpeechTranscript) => void;
    onError: (error: Error) => void;
  } | null = null;

  /**
   * Registers a speech recognition provider.
   */
  public registerProvider(provider: ISpeechRecognitionProvider): void {
    this.providers.set(provider.metadata.id, provider);
    if (!this.activeProviderId) {
      this.activeProviderId = provider.metadata.id;
    }
  }

  /**
   * Switches the active speech recognition provider.
   * Transfers active subscriptions seamlessly to the new provider to prevent stream drops.
   */
  public async setActiveProvider(id: string): Promise<void> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Speech provider with ID '${id}' is not registered.`);
    }

    const currentListener = this.activeListener;

    // Stop active listening on current provider before swapping
    if (this.activeProviderId) {
      const current = this.providers.get(this.activeProviderId);
      if (current) {
        current.stopListening();
      }
    }

    await provider.initialize();
    this.activeProviderId = id;

    // Seamlessly re-subscribe listener on the newly activated provider
    if (currentListener) {
      provider.startListening(currentListener.onResult, currentListener.onError);
    }
  }

  /**
   * Returns the currently active provider instance.
   */
  public getActiveProvider(): ISpeechRecognitionProvider | null {
    if (!this.activeProviderId) return null;
    return this.providers.get(this.activeProviderId) || null;
  }

  /**
   * Proxies startListening to active provider, tracking active subscription.
   */
  public startListening(
    onResult: (result: SpeechTranscript) => void,
    onError: (error: Error) => void
  ): void {
    const active = this.getActiveProvider();
    if (!active) {
      throw new Error("No active speech recognition provider configured.");
    }
    this.activeListener = { onResult, onError };
    active.startListening(onResult, onError);
  }

  /**
   * Proxies stopListening to active provider, clearing active subscription.
   */
  public stopListening(): void {
    const active = this.getActiveProvider();
    if (active) {
      active.stopListening();
    }
    this.activeListener = null;
  }

  public isListening(): boolean {
    return this.activeListener !== null;
  }

  /**
   * Lists the metadata definitions of all registered providers.
   */
  public listProviders(): SpeechProviderMetadata[] {
    return Array.from(this.providers.values()).map(p => p.metadata);
  }

  /**
   * Collects health status summaries for all registered providers.
   */
  public async getHealthSummary(): Promise<Record<string, SpeechProviderHealth>> {
    const summary: Record<string, SpeechProviderHealth> = {};
    for (const [id, provider] of this.providers.entries()) {
      try {
        summary[id] = await provider.health();
      } catch (err) {
        summary[id] = {
          status: "unhealthy",
          details: err instanceof Error ? err.message : "Health check failed.",
          lastChecked: Date.now()
        };
      }
    }
    return summary;
  }
}
