import { IFileAdapter } from "../interfaces";
import { JsonFileAdapter } from "../adapters/json_adapter";
import { AdapterNotFoundException } from "../errors";

export interface AdapterCapabilities {
  import: boolean;
  export: boolean;
  maxSchemaVersionSupported: number;
}

export class FormatRegistry {
  private readonly adapters = new Map<string, IFileAdapter>(); // extension -> adapter
  private readonly capabilities = new Map<IFileAdapter, AdapterCapabilities>();
  private defaultAdapter: IFileAdapter = new JsonFileAdapter();

  constructor() {
    // Register default JSON adapter handlers
    this.registerAdapter(this.defaultAdapter, {
      import: true,
      export: true,
      maxSchemaVersionSupported: 2
    });
  }

  /**
   * Registers a file format adapter with its capabilities and version compatibilities.
   */
  public registerAdapter(adapter: IFileAdapter, cap: AdapterCapabilities): void {
    for (const ext of adapter.supportedExtensions) {
      const normalizedExt = ext.toLowerCase().trim();
      this.adapters.set(normalizedExt, adapter);
    }
    this.capabilities.set(adapter, cap);
  }

  /**
   * Removes an adapter from the registry.
   */
  public removeAdapter(adapter: IFileAdapter): void {
    for (const ext of adapter.supportedExtensions) {
      const normalizedExt = ext.toLowerCase().trim();
      if (this.adapters.get(normalizedExt) === adapter) {
        this.adapters.delete(normalizedExt);
      }
    }
    this.capabilities.delete(adapter);
  }

  /**
   * Looks up an adapter by file extension, falling back to default JSON handler if not found.
   */
  public lookupAdapter(extension: string): IFileAdapter {
    const normalized = extension.toLowerCase().trim().replace(/^\./, "");
    const adapter = this.adapters.get(normalized);
    if (adapter) return adapter;

    if (this.defaultAdapter.supportedExtensions.includes(normalized)) {
      return this.defaultAdapter;
    }

    throw new AdapterNotFoundException(extension);
  }

  /**
   * Checks if an adapter supports importing and matches the current version limits.
   */
  public canImport(extension: string, maxVersionAllowed: number = 2): boolean {
    try {
      const adapter = this.lookupAdapter(extension);
      const cap = this.capabilities.get(adapter);
      if (!cap) return false;
      return cap.import && cap.maxSchemaVersionSupported <= maxVersionAllowed;
    } catch {
      return false;
    }
  }

  public canExport(extension: string): boolean {
    try {
      const adapter = this.lookupAdapter(extension);
      const cap = this.capabilities.get(adapter);
      return cap ? cap.export : false;
    } catch {
      return false;
    }
  }

  public setDefaultAdapter(adapter: IFileAdapter): void {
    this.defaultAdapter = adapter;
  }
}
