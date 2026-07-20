import { PluginManifest } from "./types";

export interface PluginPermissionRequest {
  pluginId: string;
  permission: string;
  timestamp: number;
}

export interface PluginCommunicationMessage {
  id: string;
  sourceId: string;
  targetId?: string; // Empty target indicates broadcast
  payload: any;
  timestamp: number;
}

export interface PluginDiscoveryResult {
  manifestPath: string;
  manifest: PluginManifest;
  isValid: boolean;
  errors: string[];
}
