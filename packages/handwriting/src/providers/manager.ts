import { IHandwritingRecognitionProvider, ProviderHealth } from "./interfaces";
import { Stroke2D, RecognitionResult } from "../types";

/**
 * Orchestrator managing multiple cloud, offline, and custom handwriting recognition providers.
 */
export class HandwritingProviderManager {
  private providers: Map<string, IHandwritingRecognitionProvider> = new Map();
  private activeProviderId: string | null = null;

  /**
   * Registers a new provider. Auto-activates it if it is the first registered provider.
   */
  public registerProvider(id: string, provider: IHandwritingRecognitionProvider): void {
    this.providers.set(id, provider);
    if (!this.activeProviderId) {
      this.activeProviderId = id;
    }
  }

  /**
   * Unregisters a provider by ID. Selects an alternate active provider if the active one is removed.
   */
  public unregisterProvider(id: string): void {
    this.providers.delete(id);
    if (this.activeProviderId === id) {
      const keys = Array.from(this.providers.keys());
      this.activeProviderId = keys.length > 0 ? keys[0]! : null;
    }
  }

  /**
   * Sets the active provider. Throws if the ID is not registered.
   */
  public setActiveProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider with ID '${id}' is not registered.`);
    }
    this.activeProviderId = id;
  }

  /**
   * Returns the currently active provider.
   */
  public getActiveProvider(): IHandwritingRecognitionProvider | undefined {
    if (!this.activeProviderId) return undefined;
    return this.providers.get(this.activeProviderId);
  }

  /**
   * Returns a registered provider by ID.
   */
  public getProvider(id: string): IHandwritingRecognitionProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Lists the IDs of all registered providers.
   */
  public listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Summarizes the health report of all registered providers.
   */
  public async getHealthReport(): Promise<Record<string, ProviderHealth>> {
    const report: Record<string, ProviderHealth> = {};
    for (const [id, provider] of this.providers.entries()) {
      report[id] = await provider.health();
    }
    return report;
  }

  /**
   * Triggers recognition via the active provider.
   */
  public async recognize(strokes: Stroke2D[]): Promise<RecognitionResult> {
    const active = this.getActiveProvider();
    if (!active) {
      throw new Error("No active handwriting recognition provider is configured.");
    }
    return active.recognize(strokes);
  }
}
