import { describe, it, expect } from "vitest";
import { ShapeRecognitionEngine } from "../src/engine";
import { DefaultShapeRecognitionProvider } from "../src/providers/default";
import { IShapeRecognitionProvider, ProviderMetadata, ProviderHealth } from "../src/providers/interfaces";
import { Point2D, ShapePrediction } from "../src/types";

// Setup a simple custom mock provider for testing
class MockShapeRecognitionProvider implements IShapeRecognitionProvider {
  public readonly metadata: ProviderMetadata;
  private isHealthy: "healthy" | "unhealthy" = "healthy";

  constructor(id: string, name: string) {
    this.metadata = {
      id,
      name,
      version: "2.1.0",
      description: "Mock classification provider for testing."
    };
  }

  public classify(_points: Point2D[]): ShapePrediction {
    return {
      shapeType: "triangle",
      confidence: 0.99,
      boundingBox: { x: 0, y: 0, width: 10, height: 10 },
      corners: [],
      vectorData: null,
      recognitionTimeMs: 0.5,
      recognitionSource: "rules"
    };
  }

  public getHealth(): ProviderHealth {
    return {
      status: this.isHealthy,
      details: `Mock status: ${this.isHealthy}`,
      lastChecked: Date.now()
    };
  }

  public setHealthyState(status: "healthy" | "unhealthy"): void {
    this.isHealthy = status;
  }
}

describe("Shape Recognition Provider Architecture", () => {
  it("should initialize with default provider registered and active", () => {
    const engine = new ShapeRecognitionEngine();
    const manager = engine.getProviderManager();

    expect(manager.listProviders()).toHaveLength(1);
    expect(manager.listProviders()[0]!.id).toBe("default-pipeline");

    const active = manager.getActiveProvider();
    expect(active).toBeDefined();
    expect(active!.metadata.id).toBe("default-pipeline");
  });

  it("should allow registering, listing, and swappable provider selection", () => {
    const engine = new ShapeRecognitionEngine();
    const manager = engine.getProviderManager();
    const mock = new MockShapeRecognitionProvider("mock-ml", "Mock ML Model");

    manager.registerProvider(mock);
    expect(manager.listProviders()).toHaveLength(2);
    expect(manager.getProvider("mock-ml")).toBe(mock);

    // Swap active provider
    manager.setActiveProvider("mock-ml");
    expect(manager.getActiveProvider()!.metadata.id).toBe("mock-ml");

    // Perform recognition through engine, should route to mock provider and return "triangle"
    const points = [{ x: 0, y: 0 }, { x: 5, y: 5 }];
    const prediction = engine.recognize(points);
    expect(prediction.shapeType).toBe("triangle");
    expect(prediction.confidence).toBe(0.99);
  });

  it("should report versioned metadata and health status accurately", () => {
    const engine = new ShapeRecognitionEngine();
    const manager = engine.getProviderManager();
    const mock = new MockShapeRecognitionProvider("mock-ml", "Mock ML Model");

    manager.registerProvider(mock);

    // Fetch initial health report
    let report = manager.getHealthReport();
    expect(report["default-pipeline"]!.status).toBe("healthy");
    expect(report["mock-ml"]!.status).toBe("healthy");

    // Break the mock provider health and confirm report update
    mock.setHealthyState("unhealthy");
    report = manager.getHealthReport();
    expect(report["mock-ml"]!.status).toBe("unhealthy");

    // Disable default provider health
    const defaultProv = manager.getProvider("default-pipeline") as DefaultShapeRecognitionProvider;
    defaultProv.setHealthy(false);
    report = manager.getHealthReport();
    expect(report["default-pipeline"]!.status).toBe("unhealthy");
  });

  it("should fail cleanly when trying to set an unregistered provider active", () => {
    const engine = new ShapeRecognitionEngine();
    const manager = engine.getProviderManager();

    expect(() => manager.setActiveProvider("non-existent")).toThrowError("is not registered");
  });

  it("should handle unregistering providers and fallback active selection cleanly", () => {
    const engine = new ShapeRecognitionEngine();
    const manager = engine.getProviderManager();
    const mock = new MockShapeRecognitionProvider("mock-ml", "Mock ML Model");

    manager.registerProvider(mock);
    manager.setActiveProvider("mock-ml");
    expect(manager.getActiveProvider()!.metadata.id).toBe("mock-ml");

    // Unregister active mock provider
    manager.unregisterProvider("mock-ml");
    expect(manager.listProviders()).toHaveLength(1);
    // Should fallback to default-pipeline
    expect(manager.getActiveProvider()!.metadata.id).toBe("default-pipeline");

    // Unregister remaining default provider
    manager.unregisterProvider("default-pipeline");
    expect(manager.getActiveProvider()).toBeUndefined();
    expect(() => engine.recognize([])).toThrowError("No active shape recognition provider");
  });
});
