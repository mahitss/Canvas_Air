import { PluginManifest, PluginInstance } from "../types";
import { PluginLoader } from "../loader";

export class PluginStartupOptimizer {
  private readonly loaderCache = new Map<string, PluginInstance>();

  constructor(private readonly loader: PluginLoader) {}

  /**
   * Caches loaded plugins for fast subsequent launches.
   */
  public loadCached(
    manifest: PluginManifest,
    canvas: any,
    storage: any,
    notify: any
  ): PluginInstance {
    const cached = this.loaderCache.get(manifest.id);
    if (cached) {
      return cached;
    }
    const instance = this.loader.loadFromManifest(manifest, canvas, storage, notify);
    this.loaderCache.set(manifest.id, instance);
    return instance;
  }

  /**
   * Initializes multiple plugins in parallel to avoid synchronous thread blocking.
   */
  public async parallelInitialize(
    manifests: PluginManifest[],
    canvas: any,
    storage: any,
    notify: any
  ): Promise<PluginInstance[]> {
    const promises = manifests.map((manifest) => {
      return Promise.resolve().then(() => {
        return this.loadCached(manifest, canvas, storage, notify);
      });
    });
    return Promise.all(promises);
  }

  /**
   * Generates a lazy loading context wrapper that loads full plugin resources only on first API demand invocation.
   */
  public createLazyWrapper(
    manifest: PluginManifest,
    canvas: any,
    storage: any,
    notify: any
  ): {
    getInstance: () => PluginInstance;
    callApi: (subsystem: string, method: string, args: any[]) => any;
  } {
    let instance: PluginInstance | undefined;
    
    const getInstance = (): PluginInstance => {
      if (!instance) {
        instance = this.loadCached(manifest, canvas, storage, notify);
      }
      return instance;
    };

    const callApi = (subsystem: string, method: string, args: any[]): any => {
      const inst = getInstance();
      const subsys = (inst.context as any)[subsystem];
      if (!subsys || typeof subsys[method] !== "function") {
        throw new Error(`LazyWrapperError: Subsystem '${subsystem}' or method '${method}' not found`);
      }
      return subsys[method](...args);
    };

    return {
      getInstance,
      callApi
    };
  }
}
