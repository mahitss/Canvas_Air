import { PluginManifest, PluginInstance, CanvasApi, StorageApi, NotificationApi } from "./types";
import { PermissionManager } from "./permissions/manager";
import { SandboxRuntime } from "./sandbox/runtime";
import { LifecycleManager } from "./lifecycle/manager";
import { PluginRegistry } from "./registry";

export class PluginLoader {
  private readonly permissions: PermissionManager;
  private readonly sandbox: SandboxRuntime;
  private readonly lifecycle: LifecycleManager;
  private readonly registry = new PluginRegistry();

  constructor(hostSdkVersion: string = "1.0.0") {
    this.permissions = new PermissionManager();
    this.sandbox = new SandboxRuntime(this.permissions);
    this.lifecycle = new LifecycleManager(hostSdkVersion);
  }

  public getPermissionsManager(): PermissionManager {
    return this.permissions;
  }

  public getLifecycleManager(): LifecycleManager {
    return this.lifecycle;
  }

  public getSandboxRuntime(): SandboxRuntime {
    return this.sandbox;
  }

  public getRegistry(): PluginRegistry {
    return this.registry;
  }

  /**
   * Loads plugin manifest with integrity checks, sets up sandbox runtime, and registers the instance.
   */
  public loadFromManifest(
    manifest: PluginManifest,
    hostCanvas: CanvasApi,
    hostStorage: StorageApi,
    hostNotifications: NotificationApi
  ): PluginInstance {
    // 1. Integrity verification
    this.verifyIntegrity(manifest);

    // 2. Grant permissions
    this.permissions.grantPermissions(manifest.id, manifest.permissions);

    // 3. Compile sandbox context
    const context = this.sandbox.createContext(
      manifest.id,
      hostCanvas,
      hostStorage,
      hostNotifications
    );

    // 4. Register instance
    const instance: PluginInstance = {
      manifest,
      state: "installed",
      context
    };

    this.lifecycle.registerPlugin(instance);
    this.registry.registerPlugin(instance);

    try {
      // 5. Run compatibility checks and load
      this.lifecycle.loadPlugin(manifest.id);
    } catch (err: any) {
      this.registry.setHealthStatus(manifest.id, "unhealthy");
      throw err;
    }

    return instance;
  }

  /**
   * Unloads a plugin, clearing permissions, context hooks, and registry entries.
   */
  public unloadPlugin(id: string): void {
    const instance = this.registry.getPlugin(id);
    if (!instance) return;

    this.lifecycle.unloadPlugin(id);
    this.permissions.revokePermissions(id); // Clear permissions
    this.registry.deregisterPlugin(id);
  }

  /**
   * Reloads a plugin by unloading the existing instance and loading it fresh.
   */
  public reloadPlugin(
    manifest: PluginManifest,
    hostCanvas: CanvasApi,
    hostStorage: StorageApi,
    hostNotifications: NotificationApi
  ): PluginInstance {
    this.unloadPlugin(manifest.id);
    return this.loadFromManifest(manifest, hostCanvas, hostStorage, hostNotifications);
  }

  /**
   * Performs a hot reload, preserving state or dynamically resetting context without disruption.
   */
  public hotReload(
    manifest: PluginManifest,
    hostCanvas: CanvasApi,
    hostStorage: StorageApi,
    hostNotifications: NotificationApi
  ): PluginInstance {
    const existing = this.registry.getPlugin(manifest.id);
    if (existing && existing.state === "enabled") {
      this.lifecycle.disablePlugin(manifest.id);
    }

    return this.reloadPlugin(manifest, hostCanvas, hostStorage, hostNotifications);
  }

  /**
   * Isolates plugin execution catches, preventing sandbox failures from bringing down the host system.
   */
  public executeIsolated(pluginId: string, action: () => void): void {
    try {
      action();
    } catch (err: any) {
      // Degrade health status of the failing plugin
      this.registry.setHealthStatus(pluginId, "degraded");
      const instance = this.registry.getPlugin(pluginId);
      if (instance) {
        instance.state = "failed";
        instance.error = err.message || "Isolated execution crash";
      }
      throw new Error(`Plugin isolated runtime crash: ${err.message}`);
    }
  }

  private verifyIntegrity(manifest: PluginManifest): void {
    if (!manifest.id || !manifest.entryPoint || !manifest.version) {
      throw new Error("Integrity check failed: Manifest is missing critical fields (id, entryPoint, or version)");
    }
    // Verify entry point path format
    if (manifest.entryPoint.includes("..") || manifest.entryPoint.startsWith("/")) {
      throw new Error("Integrity check failed: entryPoint cannot escape relative plugin root bounds");
    }
  }
}
export * from "./types";
export * from "./config";
export * from "./permissions/manager";
export * from "./sandbox/runtime";
export * from "./lifecycle/manager";
export * from "./sdk/context";
export * from "./registry";
