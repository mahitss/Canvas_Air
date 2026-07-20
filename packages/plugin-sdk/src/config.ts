import { PluginPlatformConfig } from "./types";

export const DEFAULT_PLUGIN_CONFIG: PluginPlatformConfig = {
  maxMemoryLimitMb: 50,
  executionTimeoutMs: 500 // 500ms synchronous execution timeouts
};
