import { describe, it, expect } from "vitest";
import { PluginLoader } from "../src/loader";
import { MockCanvas, MockStorage, MockNotifications } from "../src/sdk/context";
import { PluginManifest } from "../src/types";

describe("Plugin Loader & Registry Integration", () => {
  const hostSdkVersion = "1.0.0";

  it("should load, unload, reload, hot reload plugins, verify integrity, and track version histories / health statuses", () => {
    const loader = new PluginLoader(hostSdkVersion);
    const canvas = new MockCanvas();
    const storage = new MockStorage();
    const notify = new MockNotifications();

    const manifest: PluginManifest = {
      id: "my-effects-plugin",
      name: "Cool Effects",
      version: "1.0.0",
      author: "Gemini",
      description: "Sample custom brushes",
      permissions: ["Canvas"],
      dependencies: {},
      minimumPlatformVersion: "1.0.0",
      entryPoint: "dist/index.js"
    };

    // 1. Load Plugin
    const instance = loader.loadFromManifest(manifest, canvas, storage, notify);
    expect(instance.state).toBe("loaded");

    const registry = loader.getRegistry();
    expect(registry.getPlugin("my-effects-plugin")).toBe(instance);
    expect(registry.getHealthStatus("my-effects-plugin")).toBe("healthy");
    expect(registry.getVersionHistory("my-effects-plugin")).toContain("1.0.0");

    // 2. Version history updates on new version load
    const updatedManifest: PluginManifest = {
      ...manifest,
      version: "1.1.0"
    };
    loader.loadFromManifest(updatedManifest, canvas, storage, notify);
    expect(registry.getVersionHistory("my-effects-plugin")).toContain("1.1.0");

    // 3. Hot reload triggers status check
    const hotInstance = loader.hotReload(updatedManifest, canvas, storage, notify);
    expect(hotInstance.state).toBe("loaded");

    // 4. Error isolation degrades health status
    expect(() => {
      loader.executeIsolated("my-effects-plugin", () => {
        throw new Error("Simulated runtime crash!");
      });
    }).toThrow(/Plugin isolated runtime crash/);

    expect(registry.getHealthStatus("my-effects-plugin")).toBe("degraded");
    expect(hotInstance.state).toBe("failed");

    // 5. Unload Plugin removes it and clears permission mapping
    loader.unloadPlugin("my-effects-plugin");
    expect(registry.getPlugin("my-effects-plugin")).toBeUndefined();
    // checkPermission will throw error now as it has no allowed permission record
    expect(() => {
      loader.getPermissionsManager().checkPermission("my-effects-plugin", "Canvas");
    }).toThrow(/Security Violation/);
  });

  it("should fail integrity verification on escaping entryPoints", () => {
    const loader = new PluginLoader(hostSdkVersion);
    const canvas = new MockCanvas();
    const storage = new MockStorage();
    const notify = new MockNotifications();

    const badManifest: PluginManifest = {
      id: "hacky-plugin",
      name: "Hacky",
      version: "1.0.0",
      author: "Hacker",
      description: "Path escapes relative root directory",
      permissions: [],
      dependencies: {},
      minimumPlatformVersion: "1.0.0",
      entryPoint: "../outside/index.js" // bad path!
    };

    expect(() => {
      loader.loadFromManifest(badManifest, canvas, storage, notify);
    }).toThrow(/cannot escape relative plugin/);
  });
});
