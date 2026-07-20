import { describe, it, expect } from "vitest";
import { PluginEventBridge } from "../src/events/bridge";
import { ApiGateway } from "../src/gateway/api_gateway";
import { PermissionManager } from "../src/permissions/manager";
import { DependencyResolver } from "../src/manifest/resolver";
import { PluginStorageLayer } from "../src/storage/storage_layer";
import { MarketplaceClient } from "../src/marketplace/client";
import { ApiVersionManager } from "../src/version/version_manager";
import { PluginStartupOptimizer } from "../src/debug/optimizations";
import { PluginLoader } from "../src/loader";
import { PluginManifest } from "../src/types";

describe("Plugin SDK Comprehensive Suite", () => {
  it("should verify Event Bridge communication mechanics", async () => {
    const bridge = new PluginEventBridge();
    const received: any[] = [];
    
    // Subscribe with wildcard
    bridge.subscribe("*", (env) => received.push(env.payload));
    bridge.publish("draw.stroke", "stroke-data", "plugin-1");
    expect(received).toContain("stroke-data");

    // Request/Response
    bridge.registerRequestHandler("ai.classify", (req, sender) => {
      expect(sender).toBe("plugin-2");
      return `classified:${req}`;
    });

    const res = await bridge.request("ai.classify", "image-bin", "plugin-2");
    expect(res).toBe("classified:image-bin");
  });

  it("should assert Gateway permission enforcement gates", () => {
    const pm = new PermissionManager();
    const gateway = new ApiGateway(pm, {
      canvas: { drawCircle: () => "drawn" }
    });

    const context = gateway.compileGateway("plugin-test");
    expect(() => context.canvas.drawCircle(10, 20, 5)).toThrow(/Security Violation/);

    pm.grantPermissions("plugin-test", ["Canvas"]);
    expect(context.canvas.drawCircle(10, 20, 5)).toBe("drawn");
  });

  it("should resolve dependencies, sorting order and detecting cycles", () => {
    const resolver = new DependencyResolver();
    const manifestA: PluginManifest = {
      id: "A", name: "A", version: "1.0.0", author: "Dev", description: "",
      permissions: [], dependencies: { "B": "^1.0.0" }, minimumPlatformVersion: "1.0.0", entryPoint: "index.js"
    };
    const manifestB: PluginManifest = {
      id: "B", name: "B", version: "1.2.0", author: "Dev", description: "",
      permissions: [], dependencies: {}, minimumPlatformVersion: "1.0.0", entryPoint: "index.js"
    };

    const order = resolver.resolveOrder([manifestA, manifestB]);
    expect(order).toEqual(["B", "A"]);

    // Cycle detection
    const manifestCycleB: PluginManifest = {
      id: "B", name: "B", version: "1.2.0", author: "Dev", description: "",
      permissions: [], dependencies: { "A": "^1.0.0" }, minimumPlatformVersion: "1.0.0", entryPoint: "index.js"
    };

    expect(() => {
      resolver.resolveOrder([manifestA, manifestCycleB]);
    }).toThrow(/Cycle detected/);
  });

  it("should execute storage serializations and migrations", () => {
    const storage = new PluginStorageLayer();
    
    // Register migration from version 1 to 2
    storage.registerMigration("plugin-x", 2, (old) => {
      return { ...old, migratedVal: "transformed_" + old.value };
    });

    storage.save("plugin-x", 1, { value: "hello" });

    // Load with current version 2, should execute migration hook
    const data = storage.load("plugin-x", 2);
    expect(data.migratedVal).toBe("transformed_hello");
  });

  it("should integrate with marketplace catalog operations", async () => {
    const loader = new PluginLoader("1.2.0");
    const marketplace = new MarketplaceClient(loader, "1.2.0");

    const itemManifest: PluginManifest = {
      id: "brush-plugin", name: "Brush Tool", version: "1.0.0", author: "Hacker", description: "",
      permissions: ["Canvas"], dependencies: {}, minimumPlatformVersion: "1.1.0", entryPoint: "index.js"
    };

    marketplace.registerCatalogItem({
      id: "brush-plugin",
      name: "Brush Tool",
      manifest: itemManifest,
      rating: 4.8,
      reviewsCount: 120,
      compatibilityScore: 100
    });

    expect(marketplace.search("brush").length).toBe(1);

    // Install checks compatibility (host version '1.2.0' >= minVersion '1.1.0' -> satisfies)
    await marketplace.install("brush-plugin", {}, {}, {});
    expect(loader.getRegistry().getPlugin("brush-plugin")).toBeDefined();
  });

  it("should negotiate API versions and emit deprecation flags", () => {
    const vm = new ApiVersionManager();
    vm.registerApiVersion("voice", {
      version: "1.0.0",
      deprecated: true,
      deprecationWarning: "API version 1.0.0 is deprecated. Upgrade to 2.0.0."
    });
    vm.registerApiVersion("voice", {
      version: "2.0.0"
    });

    const negotiation = vm.negotiateVersion("voice", "^1.0.0");
    expect(negotiation.resolvedVersion).toBe("1.0.0");
    expect(negotiation.shouldWarn).toBe(true);
    expect(negotiation.warningMessage).toContain("deprecated");
  });

  it("should initialize parallel packages and lazy load runtime", async () => {
    const loader = new PluginLoader("1.0.0");
    const optimizer = new PluginStartupOptimizer(loader);

    const m: PluginManifest = {
      id: "fast-plugin", name: "Fast", version: "1.0.0", author: "Dev", description: "",
      permissions: [], dependencies: {}, minimumPlatformVersion: "1.0.0", entryPoint: "index.js"
    };

    const wrapper = optimizer.createLazyWrapper(m, {}, {}, {});
    // Should NOT be loaded yet
    expect(loader.getRegistry().getPlugin("fast-plugin")).toBeUndefined();

    // Trigger lazy load
    const inst = wrapper.getInstance();
    expect(inst).toBeDefined();
    expect(loader.getRegistry().getPlugin("fast-plugin")).toBeDefined();
  });
});
