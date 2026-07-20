import { describe, it, expect, vi } from "vitest";
import { DefaultHandwritingRecognitionProvider } from "../src/providers/default";
import { HandwritingProviderManager } from "../src/providers/manager";
import { IHandwritingRecognitionProvider, ProviderHealth } from "../src/providers/interfaces";
import { Stroke2D, RecognitionResult } from "../src/types";

// Setup a simple custom cloud provider mock for testing
class MockCloudHandwritingProvider implements IHandwritingRecognitionProvider {
  private isConnected = false;

  public async initialize(): Promise<void> {
    this.isConnected = true;
  }

  public async recognize(_strokes: Stroke2D[]): Promise<RecognitionResult> {
    if (!this.isConnected) {
      throw new Error("Cloud not connected.");
    }
    return {
      text: "hello cloud",
      confidence: 0.98,
      words: [
        {
          text: "hello cloud",
          confidence: 0.98,
          characters: []
        }
      ],
      recognitionTimeMs: 120.0
    };
  }

  public async dispose(): Promise<void> {
    this.isConnected = false;
  }

  public async health(): Promise<ProviderHealth> {
    return {
      status: this.isConnected ? "healthy" : "unhealthy",
      details: this.isConnected ? "Cloud connected successfully." : "Cloud is disconnected.",
      lastChecked: Date.now()
    };
  }

  public version(): string {
    return "3.2.0-cloud";
  }
}

describe("Handwriting Recognition Provider Architecture", () => {
  it("should initialize, recognize, check health, and dispose the default offline provider", async () => {
    const provider = new DefaultHandwritingRecognitionProvider();

    // Version check
    expect(provider.version()).toBe("1.0.0");

    // Uninitialized throws
    await expect(provider.recognize([])).rejects.toThrow("not initialized");

    let health = await provider.health();
    expect(health.status).toBe("unhealthy");

    // Initialize
    await provider.initialize();
    health = await provider.health();
    expect(health.status).toBe("healthy");
    expect(health.details).toContain("Offline engine active");

    // Recognize empty strokes list (returns empty text buffer)
    const result = await provider.recognize([]);
    expect(result.text).toBe("");
    expect(result.confidence).toBe(0.0);

    // Dispose
    await provider.dispose();
    health = await provider.health();
    expect(health.status).toBe("unhealthy");
  });

  it("should register, hot-swap, and query custom cloud providers through manager", async () => {
    const manager = new HandwritingProviderManager();
    const offline = new DefaultHandwritingRecognitionProvider();
    const cloud = new MockCloudHandwritingProvider();

    await offline.initialize();
    await cloud.initialize();

    manager.registerProvider("offline", offline);
    manager.registerProvider("cloud", cloud);

    expect(manager.listProviders()).toEqual(["offline", "cloud"]);
    expect(manager.getActiveProvider()!.version()).toBe("1.0.0");

    // Hot-swap active provider
    manager.setActiveProvider("cloud");
    expect(manager.getActiveProvider()!.version()).toBe("3.2.0-cloud");

    // Perform recognition through manager, should route to cloud
    const result = await manager.recognize([]);
    expect(result.text).toBe("hello cloud");
    expect(result.confidence).toBe(0.98);

    // Health report summaries
    const healthReport = await manager.getHealthReport();
    expect(healthReport["offline"]!.status).toBe("healthy");
    expect(healthReport["cloud"]!.status).toBe("healthy");

    await offline.dispose();
    await cloud.dispose();
  });

  it("should handle fallbacks when unregistering active provider", () => {
    const manager = new HandwritingProviderManager();
    const offline = new DefaultHandwritingRecognitionProvider();
    const cloud = new MockCloudHandwritingProvider();

    manager.registerProvider("offline", offline);
    manager.registerProvider("cloud", cloud);
    manager.setActiveProvider("offline");

    // Remove active offline provider
    manager.unregisterProvider("offline");
    // Active should fallback to remaining provider
    expect(manager.getActiveProvider()).toBe(cloud);

    manager.unregisterProvider("cloud");
    expect(manager.getActiveProvider()).toBeUndefined();
  });
});
