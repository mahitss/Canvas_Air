export interface StorageDataEnvelope {
  schemaVersion: number;
  data: Record<string, any>;
  lastUpdated: number;
}

export type StorageMigrationHook = (oldData: any) => any;

export class PluginStorageLayer {
  private readonly mockStore = new Map<string, string>(); // simulated local disk
  private readonly migrationRegistry = new Map<string, Map<number, StorageMigrationHook>>(); // pluginId -> (targetVersion -> migrator)

  /**
   * Loads scoped payload envelopes for target plugin, resolving migration transformations if schema versions mismatch.
   */
  public load(pluginId: string, currentSchemaVersion: number): Record<string, any> {
    const key = `plugin:${pluginId}:storage`;
    const serialized = this.mockStore.get(key);
    if (!serialized) {
      return {};
    }

    try {
      const envelope: StorageDataEnvelope = JSON.parse(serialized);
      let data = envelope.data;
      let loadedVersion = envelope.schemaVersion;

      // Apply migration steps sequentially
      while (loadedVersion < currentSchemaVersion) {
        const nextVersion = loadedVersion + 1;
        const migrator = this.migrationRegistry.get(pluginId)?.get(nextVersion);
        if (!migrator) {
          console.warn(`[StorageMigrationWarning] No migrator registered from version ${loadedVersion} to ${nextVersion} for plugin ${pluginId}.`);
          break;
        }
        data = migrator(data);
        loadedVersion = nextVersion;
      }

      return data;
    } catch (err) {
      console.error(`[StorageLoadError] Failed to deserialize plugin storage for ${pluginId}:`, err);
      return {};
    }
  }

  /**
   * Saves scoped payloads, updating schema versioning.
   */
  public save(pluginId: string, schemaVersion: number, data: Record<string, any>): void {
    const key = `plugin:${pluginId}:storage`;
    const envelope: StorageDataEnvelope = {
      schemaVersion,
      data,
      lastUpdated: Date.now()
    };
    this.mockStore.set(key, JSON.stringify(envelope));
  }

  /**
   * Registers a migration conversion hook from previous schemas.
   */
  public registerMigration(pluginId: string, targetVersion: number, migrator: StorageMigrationHook): void {
    let pMap = this.migrationRegistry.get(pluginId);
    if (!pMap) {
      pMap = new Map();
      this.migrationRegistry.set(pluginId, pMap);
    }
    pMap.set(targetVersion, migrator);
  }
}
