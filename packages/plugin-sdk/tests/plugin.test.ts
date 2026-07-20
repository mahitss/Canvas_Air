import { describe, it, expect } from "vitest";
import { PluginLoader } from "../src/loader";
import { MockCanvas, MockStorage, MockNotifications } from "../src/sdk/context";
import { PluginManifest } from "../src/types";

describe("Plugin Platform Extensions Loader", () => {
  const hostSdkVersion = "1.2.0";

  it("should parse manifests, verify version, and transition lifecycle states", () => {
    const loader = new PluginLoader(hostSdkVersion);
    const canvas = new MockCanvas();
    const storage = new MockStorage();
    const notify = new MockNotifications();

    const manifest: PluginManifest = {
      id: "test-plugin-id",
      name: "Brush tool extension",
      version: "1.0.0",
      author: "VisionCanvas",
      description: "Simple neon custom brush tools.",
      permissions: ["Canvas"],
      dependencies: {},
      minimumPlatformVersion: "^1.0.0",
      entryPoint: "index.js"
    };

    const instance = loader.loadFromManifest(manifest, canvas, storage, notify);
    expect(instance.state).toBe("loaded");

    // Enable plugin state transitions
    const lm = loader.getLifecycleManager();
    lm.enablePlugin(manifest.id);
    expect(instance.state).toBe("enabled");
  });

  it("should reject loaded lifecycle state on incompatible SDK version ranges", () => {
    const loader = new PluginLoader(hostSdkVersion);
    const canvas = new MockCanvas();
    const storage = new MockStorage();
    const notify = new MockNotifications();

    const manifest: PluginManifest = {
      id: "incompatible-plugin",
      name: "Outdated tool",
      version: "0.9.0",
      author: "Legacy Dev",
      description: "Uses host sdk v2.0",
      permissions: [],
      dependencies: {},
      minimumPlatformVersion: "^2.0.0",
      entryPoint: "index.js"
    };

    expect(() => {
      loader.loadFromManifest(manifest, canvas, storage, notify);
    }).toThrow();
  });
});

describe("Sandbox Permission Enforcement Gates", () => {
  const hostSdkVersion = "1.2.0";

  it("should allow context API executions when permission tokens are declared", () => {
    const loader = new PluginLoader(hostSdkVersion);
    const canvas = new MockCanvas();
    const storage = new MockStorage();
    const notify = new MockNotifications();

    const manifest: PluginManifest = {
      id: "authorized-plugin",
      name: "Authorized Pen",
      version: "1.0.0",
      author: "Figma Dev",
      description: "Draws circles.",
      permissions: ["Canvas"],
      dependencies: {},
      minimumPlatformVersion: "*",
      entryPoint: "index.js"
    };

    const instance = loader.loadFromManifest(manifest, canvas, storage, notify);
    
    // Call drawCircle via sandbox context
    instance.context.canvas.drawCircle(10, 20, 5);
    expect(canvas.drawCalls).toContain("circle:10,20,5");
  });

  it("should block context API executions and throw security errors when permissions are missing", () => {
    const loader = new PluginLoader(hostSdkVersion);
    const canvas = new MockCanvas();
    const storage = new MockStorage();
    const notify = new MockNotifications();

    const manifest: PluginManifest = {
      id: "unauthorized-plugin",
      name: "Silent Pen",
      version: "1.0.0",
      author: "Shadow Dev",
      description: "Attemps to draw circles silently without permissions.",
      permissions: [],
      dependencies: {},
      minimumPlatformVersion: "*",
      entryPoint: "index.js"
    };

    const instance = loader.loadFromManifest(manifest, canvas, storage, notify);

    // Call drawCircle, should raise Security Violation error
    expect(() => {
      instance.context.canvas.drawCircle(10, 20, 5);
    }).toThrow(/Security Violation/);
  });
});

describe("Crash Isolation & Deactivation Safety", () => {
  it("should capture unhandled exceptions safely within runSafe wrappers", () => {
    const loader = new PluginLoader("1.0.0");
    const runtime = loader.getSandboxRuntime();

    const maliciousFunction = () => {
      throw new Error("Malicious heap corruption simulation.");
    };

    expect(() => {
      runtime.runSafe(maliciousFunction, { executionTimeoutMs: 100 });
    }).toThrow(/Plugin Sandboxed Execution Exception/);
  });
});
