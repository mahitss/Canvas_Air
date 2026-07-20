import { PluginInstance } from "../types";

export class LifecycleManager {
  private instances: Map<string, PluginInstance> = new Map();
  private hostSdkVersion: string = "1.0.0";

  constructor(hostSdkVersion: string = "1.0.0") {
    this.hostSdkVersion = hostSdkVersion;
  }

  public registerPlugin(instance: PluginInstance): void {
    this.instances.set(instance.manifest.id, instance);
  }

  public getPlugin(id: string): PluginInstance | undefined {
    return this.instances.get(id);
  }

  /**
   * Loads plugin files and executes host sdk compatibility checks.
   */
  public loadPlugin(id: string): void {
    const p = this.getPlugin(id);
    if (!p) throw new Error(`Cannot load missing plugin: ${id}`);

    // Check SDK compatibility
    const isCompatible = this.checkCompatibility(p.manifest.minimumPlatformVersion, this.hostSdkVersion);
    if (!isCompatible) {
      p.state = "failed";
      p.error = `SDK version mismatch. Expected ${p.manifest.minimumPlatformVersion}, host runs ${this.hostSdkVersion}`;
      throw new Error(`Incompatible plugin SDK version requirements for plugin: ${id}`);
    }

    p.state = "loaded";
  }

  /**
   * Activates and enables plugin runtimes.
   */
  public enablePlugin(id: string): void {
    const p = this.getPlugin(id);
    if (!p) throw new Error(`Cannot enable missing plugin: ${id}`);
    
    if (p.state !== "loaded" && p.state !== "disabled") {
      throw new Error(`Cannot enable plugin '${id}' when in state: ${p.state}`);
    }

    p.state = "enabled";
  }

  /**
   * Deactivates and disables plugin runtimes.
   */
  public disablePlugin(id: string): void {
    const p = this.getPlugin(id);
    if (!p) throw new Error(`Cannot disable missing plugin: ${id}`);

    if (p.state !== "enabled") {
      throw new Error(`Cannot disable plugin '${id}' when in state: ${p.state}`);
    }

    p.state = "disabled";
  }

  /**
   * Unloads plugin instances.
   */
  public unloadPlugin(id: string): void {
    const p = this.getPlugin(id);
    if (!p) return;
    p.state = "installed";
    this.instances.delete(id);
  }

  private checkCompatibility(reqVersion: string, hostVersion: string): boolean {
    // Basic semantic version checks. If matching exactly or starting with caret/greater range
    if (reqVersion === "*" || reqVersion === hostVersion) return true;

    const cleanReq = reqVersion.replace(/[^\d\.]/g, "");
    const cleanHost = hostVersion.replace(/[^\d\.]/g, "");

    const reqParts = cleanReq.split(".").map(Number);
    const hostParts = cleanHost.split(".").map(Number);

    // If starting with caret '^', major versions must match exactly
    if (reqVersion.startsWith("^")) {
      return reqParts[0] === hostParts[0];
    }

    // Default direct comparison check
    for (let i = 0; i < Math.max(reqParts.length, hostParts.length); i++) {
      const rVal = reqParts[i] ?? 0;
      const hVal = hostParts[i] ?? 0;
      if (hVal !== rVal) {
        return hVal > rVal;
      }
    }

    return true;
  }
}
