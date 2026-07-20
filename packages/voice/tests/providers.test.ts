import { describe, it, expect, vi } from "vitest";
import { DefaultSpeechRecognitionProvider } from "../src/providers/default";
import { SpeechProviderManager } from "../src/providers/manager";
import { ISpeechRecognitionProvider } from "../src/providers/interfaces";

describe("Speech Recognition Provider System", () => {
  it("should initialize default provider and run standard recognition lifecycles", async () => {
    const provider = new DefaultSpeechRecognitionProvider();
    
    expect(provider.metadata.id).toBe("default-browser-stt");
    expect(provider.metadata.type).toBe("browser");

    await provider.initialize();
    
    // Test recognize method
    const buffer = new ArrayBuffer(100);
    const result = await provider.recognize(buffer);
    expect(result.transcript).toBe("simulated transcript from audio buffer");
    expect(result.confidence).toBeGreaterThan(0.8);

    // Test health check
    const health = await provider.health();
    expect(health.status).toBe("healthy");

    await provider.dispose();
  });

  it("should coordinate provider manager registrations, health check lists, and hot-swaps", async () => {
    const manager = new SpeechProviderManager();
    const browserProvider = new DefaultSpeechRecognitionProvider();
    
    // Create offline mock provider
    const offlineProvider: ISpeechRecognitionProvider = {
      metadata: {
        id: "offline-vosk-stt",
        name: "Offline Vosk Speech Recognizer",
        type: "offline",
        version: "1.2.0"
      },
      initialize: vi.fn(),
      startListening: vi.fn(),
      stopListening: vi.fn(),
      recognize: vi.fn(),
      dispose: vi.fn(),
      health: vi.fn().mockResolvedValue({
        status: "healthy",
        details: "Vosk offline active.",
        lastChecked: Date.now()
      })
    };

    // Register providers
    manager.registerProvider(browserProvider);
    manager.registerProvider(offlineProvider);

    // Assert listings
    const metadataList = manager.listProviders();
    expect(metadataList).toHaveLength(2);
    expect(metadataList.map(m => m.id)).toContain("default-browser-stt");
    expect(metadataList.map(m => m.id)).toContain("offline-vosk-stt");

    // Active provider should default to the first registered provider
    expect(manager.getActiveProvider()!.metadata.id).toBe("default-browser-stt");

    // Hot-swap provider
    await manager.setActiveProvider("offline-vosk-stt");
    expect(manager.getActiveProvider()!.metadata.id).toBe("offline-vosk-stt");
    expect(offlineProvider.initialize).toHaveBeenCalled();

    // Verify health summaries
    const summaries = await manager.getHealthSummary();
    expect(summaries["offline-vosk-stt"]!.status).toBe("healthy");
  });

  it("should transfer active listening subscriptions dynamically when swapping active providers", async () => {
    const manager = new SpeechProviderManager();

    const providerA: ISpeechRecognitionProvider = {
      metadata: { id: "prov-a", name: "A", type: "browser", version: "1" },
      initialize: vi.fn(),
      startListening: vi.fn(),
      stopListening: vi.fn(),
      recognize: vi.fn(),
      dispose: vi.fn(),
      health: vi.fn()
    };

    const providerB: ISpeechRecognitionProvider = {
      metadata: { id: "prov-b", name: "B", type: "offline", version: "1" },
      initialize: vi.fn(),
      startListening: vi.fn(),
      stopListening: vi.fn(),
      recognize: vi.fn(),
      dispose: vi.fn(),
      health: vi.fn()
    };

    manager.registerProvider(providerA);
    manager.registerProvider(providerB);

    const onResultSpy = vi.fn();
    const onErrorSpy = vi.fn();

    // Start listening on current active provider (providerA)
    manager.startListening(onResultSpy, onErrorSpy);
    expect(providerA.startListening).toHaveBeenCalledWith(onResultSpy, onErrorSpy);

    // Switch provider dynamically
    await manager.setActiveProvider("prov-b");

    // Old provider is stopped, new provider receives subscription transfer
    expect(providerA.stopListening).toHaveBeenCalled();
    expect(providerB.initialize).toHaveBeenCalled();
    expect(providerB.startListening).toHaveBeenCalledWith(onResultSpy, onErrorSpy);
  });
});
