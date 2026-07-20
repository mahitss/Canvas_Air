import { describe, it, expect } from "vitest";
import { ModuleRegistry } from "../src/registry/module_registry";
import { AiModule } from "../src/types";

describe("AI Provider Registry", () => {
  it("should support registering, unregistering, versioning, priorities, health checks, and capabilities metadata", async () => {
    const registry = new ModuleRegistry();

    // 1. Define distinct providers
    const shapeModule: AiModule = {
      name: "ShapeRecognitionProvider",
      capabilities: ["shape_recognition"],
      execute: async () => "circle",
      healthCheck: async () => true,
      version: "1.2.0",
      priority: 10,
      metadata: { gpuAccelerated: true }
    };

    const handwritingModule: AiModule = {
      name: "HandwritingProvider",
      capabilities: ["handwriting"],
      execute: async () => "hello",
      healthCheck: async () => false, // unhealthy!
      version: "2.0.1",
      priority: 5
    };

    const ocrHighPriority: AiModule = {
      name: "OcrProviderHigh",
      capabilities: ["ocr"],
      execute: async () => "text-high",
      healthCheck: async () => true,
      version: "3.0.0",
      priority: 50
    };

    const ocrLowPriority: AiModule = {
      name: "OcrProviderLow",
      capabilities: ["ocr"],
      execute: async () => "text-low",
      healthCheck: async () => true,
      version: "1.0.0",
      priority: 2
    };

    // 2. Register modules
    registry.register(shapeModule);
    registry.register(handwritingModule);
    registry.register(ocrHighPriority);
    registry.register(ocrLowPriority);

    expect(registry.getAvailableModules()).toContain("ShapeRecognitionProvider");
    expect(registry.getAvailableModules()).toContain("HandwritingProvider");

    // 3. Versioning & metadata check
    const shape = registry.getModule("ShapeRecognitionProvider");
    expect(shape).toBeDefined();
    expect(shape?.version).toBe("1.2.0");
    expect(shape?.metadata?.gpuAccelerated).toBe(true);

    // 4. Priority sorting logic
    const ocrModules = registry.getModulesByCapability("ocr");
    expect(ocrModules.length).toBe(2);
    expect(ocrModules[0]?.name).toBe("OcrProviderHigh"); // sorted first due to priority 50
    expect(ocrModules[1]?.name).toBe("OcrProviderLow");

    // 5. Health status update
    const initialHealth = shape?.status;
    expect(initialHealth).toBe("healthy");

    const healthMap = await registry.runHealthCheck();
    expect(healthMap["ShapeRecognitionProvider"]).toBe(true);
    expect(healthMap["HandwritingProvider"]).toBe(false);

    expect(registry.getModule("HandwritingProvider")?.status).toBe("unhealthy");

    // Best module selection prioritizes healthy module
    const bestOcr = registry.getModuleForCapability("ocr");
    expect(bestOcr?.name).toBe("OcrProviderHigh");

    // 6. Unregister provider
    registry.unregister("HandwritingProvider");
    expect(registry.getAvailableModules()).not.toContain("HandwritingProvider");
    expect(registry.getModule("HandwritingProvider")).toBeUndefined();
  });
});
