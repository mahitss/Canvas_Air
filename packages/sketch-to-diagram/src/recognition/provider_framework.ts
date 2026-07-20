import { SemanticRepresentation, ClassificationResult } from "../domain";

export interface ProviderCapabilities {
  supportedDiagramTypes: string[];
  maxNodesLimit: number;
  multiLabelEnabled: boolean;
}

export interface IDiagramClassifierProvider {
  name: string;
  type: "local" | "cloud" | "llm";
  version: string;
  capabilities: ProviderCapabilities;
  checkHealth(): Promise<"healthy" | "degraded" | "down">;
  classify(rep: SemanticRepresentation): Promise<ClassificationResult>;
}

export class ProviderFrameworkRegistry {
  private readonly providers = new Map<string, IDiagramClassifierProvider>();
  private activeProviderName: string | null = null;

  public registerProvider(provider: IDiagramClassifierProvider): void {
    this.providers.set(provider.name, provider);
    if (!this.activeProviderName) {
      this.activeProviderName = provider.name;
    }
  }

  public unregisterProvider(name: string): void {
    this.providers.delete(name);
    if (this.activeProviderName === name) {
      this.activeProviderName = this.providers.keys().next().value || null;
    }
  }

  public setActiveProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`ProviderNotFoundException: Provider ${name} does not exist`);
    }
    this.activeProviderName = name;
  }

  public getActiveProvider(): IDiagramClassifierProvider | null {
    if (!this.activeProviderName) return null;
    return this.providers.get(this.activeProviderName) || null;
  }

  public getProviders(): IDiagramClassifierProvider[] {
    return Array.from(this.providers.values());
  }
}
