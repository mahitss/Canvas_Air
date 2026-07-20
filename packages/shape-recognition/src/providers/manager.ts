import { IShapeRecognitionProvider, ProviderMetadata, ProviderHealth } from "./interfaces";
import { Point2D, ShapePrediction } from "../types";

/**
 * Registry and orchestrator managing multiple hot-swappable Shape Recognition providers.
 */
export class ShapeRecognitionProviderManager {
  private providers: Map<string, IShapeRecognitionProvider> = new Map();
  private activeProviderId: string | null = null;

  /**
   * Registers a new shape recognition provider.
   * If no provider was active, it sets this provider as active.
   */
  public registerProvider(provider: IShapeRecognitionProvider): void {
    this.providers.set(provider.metadata.id, provider);
    if (!this.activeProviderId) {
      this.activeProviderId = provider.metadata.id;
    }
  }

  /**
   * Unregisters a shape recognition provider by ID.
   * Swaps the active provider if the active one is removed.
   */
  public unregisterProvider(id: string): void {
    this.providers.delete(id);
    if (this.activeProviderId === id) {
      const keys = Array.from(this.providers.keys());
      this.activeProviderId = keys.length > 0 ? keys[0]! : null;
    }
  }

  /**
   * Retrieves the currently active provider.
   */
  public getActiveProvider(): IShapeRecognitionProvider | undefined {
    if (!this.activeProviderId) return undefined;
    return this.providers.get(this.activeProviderId);
  }

  /**
   * Sets the active provider by ID. Throws if the ID is not registered.
   */
  public setActiveProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider with ID '${id}' is not registered.`);
    }
    this.activeProviderId = id;
  }

  /**
   * Retrieves a registered provider by ID.
   */
  public getProvider(id: string): IShapeRecognitionProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Lists the metadata of all registered providers.
   */
  public listProviders(): ProviderMetadata[] {
    return Array.from(this.providers.values()).map(p => p.metadata);
  }

  /**
   * Returns a map containing the health reports of all registered providers.
   */
  public getHealthReport(): Record<string, ProviderHealth> {
    const report: Record<string, ProviderHealth> = {};
    for (const [id, provider] of this.providers.entries()) {
      report[id] = provider.getHealth();
    }
    return report;
  }

  /**
   * Classifies a stroke coordinate sequence using the currently active provider.
   */
  public classify(points: Point2D[]): ShapePrediction {
    const active = this.getActiveProvider();
    if (!active) {
      throw new Error("No active shape recognition provider configured.");
    }
    return active.classify(points);
  }
}
