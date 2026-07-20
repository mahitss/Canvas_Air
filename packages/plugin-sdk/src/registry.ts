import { PluginInstance } from "./types";
import { IPluginRegistry } from "./interfaces";

export class PluginRegistry implements IPluginRegistry {
  private readonly instances = new Map<string, PluginInstance>();
  private readonly versionHistories = new Map<string, string[]>(); // pluginId -> versions[]
  private readonly healthStatuses = new Map<string, "healthy" | "unhealthy" | "degraded">();

  public registerPlugin(instance: PluginInstance): void {
    const id = instance.manifest.id;
    this.instances.set(id, instance);

    // Track version history over time
    let history = this.versionHistories.get(id);
    if (!history) {
      history = [];
      this.versionHistories.set(id, history);
    }
    if (!history.includes(instance.manifest.version)) {
      history.push(instance.manifest.version);
    }

    // Default health status setup
    this.healthStatuses.set(id, instance.state === "failed" ? "unhealthy" : "healthy");
  }

  public deregisterPlugin(id: string): void {
    this.instances.delete(id);
    this.healthStatuses.delete(id);
  }

  public getPlugin(id: string): PluginInstance | undefined {
    return this.instances.get(id);
  }

  public getAllPlugins(): PluginInstance[] {
    return Array.from(this.instances.values());
  }

  public getVersionHistory(id: string): string[] {
    return this.versionHistories.get(id) ?? [];
  }

  public getHealthStatus(id: string): "healthy" | "unhealthy" | "degraded" {
    return this.healthStatuses.get(id) ?? "unhealthy";
  }

  public setHealthStatus(id: string, status: "healthy" | "unhealthy" | "degraded"): void {
    this.healthStatuses.set(id, status);
  }
}
