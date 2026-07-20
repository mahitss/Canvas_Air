export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: string[];
  dependencies: Record<string, string>; // Maps dependency ID to semver range
  minimumPlatformVersion: string;
  entryPoint: string;
}

export type PluginLifecycleState =
  | "installed"
  | "loaded"
  | "enabled"
  | "disabled"
  | "failed";

export interface CanvasApi {
  drawCircle(x: number, y: number, radius: number): void;
  drawRect(x: number, y: number, w: number, h: number): void;
  clearCanvas(): void;
}

export interface StorageApi {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface NotificationApi {
  notify(message: string): void;
}

export interface PluginContext {
  canvas: CanvasApi;
  storage: StorageApi;
  notifications: NotificationApi;
}

export interface PluginInstance {
  manifest: PluginManifest;
  state: PluginLifecycleState;
  context: PluginContext;
  error?: string;
}

export interface PluginPlatformConfig {
  maxMemoryLimitMb: number;
  executionTimeoutMs: number;
}
