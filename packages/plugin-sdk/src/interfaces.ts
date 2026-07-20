import { PluginManifest, PluginInstance, PluginLifecycleState } from "./types";

export interface IPluginLifecycleManager {
  loadPlugin(manifest: PluginManifest): Promise<PluginInstance>;
  unloadPlugin(id: string): Promise<void>;
  enablePlugin(id: string): Promise<void>;
  disablePlugin(id: string): Promise<void>;
  getPluginState(id: string): PluginLifecycleState;
}

export interface IPluginDiscoveryService {
  discoverPlugins(directoryPath: string): Promise<PluginManifest[]>;
}

export interface IPluginRegistry {
  registerPlugin(instance: PluginInstance): void;
  deregisterPlugin(id: string): void;
  getPlugin(id: string): PluginInstance | undefined;
  getAllPlugins(): PluginInstance[];
}

export interface IPluginMessenger {
  sendMessage(sourceId: string, targetId: string, message: any): Promise<void>;
  broadcastMessage(sourceId: string, message: any): Promise<void>;
  subscribe(pluginId: string, callback: (message: any) => void): () => void;
}

export interface IPluginPermissionManager {
  hasPermission(pluginId: string, permission: string): boolean;
  requestPermission(pluginId: string, permission: string): Promise<boolean>;
  revokePermission(pluginId: string, permission: string): void;
}
