import { PluginManifest } from "../types";
import { PluginLoader } from "../loader";

export interface MarketplaceItem {
  id: string;
  name: string;
  manifest: PluginManifest;
  rating: number;
  reviewsCount: number;
  compatibilityScore: number;
}

export class MarketplaceClient {
  private readonly remoteCatalog = new Map<string, MarketplaceItem>();

  constructor(
    private readonly loader: PluginLoader,
    private readonly hostVersion: string = "1.0.0"
  ) {}

  public registerCatalogItem(item: MarketplaceItem): void {
    this.remoteCatalog.set(item.id, item);
  }

  /**
   * Retrieves and discovers available remote marketplace plugins matching optional query text.
   */
  public search(query: string = ""): MarketplaceItem[] {
    const list = Array.from(this.remoteCatalog.values());
    if (!query) return list;
    
    const lc = query.toLowerCase();
    return list.filter((item) => 
      item.name.toLowerCase().includes(lc) || 
      item.id.toLowerCase().includes(lc)
    );
  }

  /**
   * Evaluates platform SDK version criteria and installs a plugin dynamically from the catalog.
   */
  public async install(
    pluginId: string,
    canvas: any,
    storage: any,
    notify: any
  ): Promise<void> {
    const item = this.remoteCatalog.get(pluginId);
    if (!item) {
      throw new Error(`MarketplaceError: Plugin '${pluginId}' not found in the remote registry catalog`);
    }

    // 1. Compatibility Check
    const minV = item.manifest.minimumPlatformVersion;
    const isCompatible = this.compareVersions(this.hostVersion, minV);
    if (!isCompatible) {
      throw new Error(`MarketplaceError: Plugin '${pluginId}' requires minimum platform version ${minV}, host is running ${this.hostVersion}`);
    }

    // 2. Load manifest (installs in Sandbox registry)
    this.loader.loadFromManifest(item.manifest, canvas, storage, notify);
  }

  /**
   * Updates an installed plugin with the latest manifest from the remote catalog.
   */
  public async update(
    pluginId: string,
    canvas: any,
    storage: any,
    notify: any
  ): Promise<void> {
    const item = this.remoteCatalog.get(pluginId);
    if (!item) {
      throw new Error(`MarketplaceError: Update target '${pluginId}' not found in the catalog`);
    }

    // Perform hot reload dynamic updates
    this.loader.hotReload(item.manifest, canvas, storage, notify);
  }

  /**
   * Unloads and removes a plugin from the platform environment.
   */
  public async remove(pluginId: string): Promise<void> {
    this.loader.unloadPlugin(pluginId);
  }

  private compareVersions(v1: string, v2: string): boolean {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] ?? 0;
      const p2 = parts2[i] ?? 0;
      if (p1 > p2) return true;
      if (p1 < p2) return false;
    }
    return true; // equal
  }
}
