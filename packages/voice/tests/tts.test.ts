import { describe, it, expect, vi } from "vitest";
import { DefaultTtsProvider } from "../src/tts/provider";
import { TextToSpeechService } from "../src/tts/service";
import { TtsSpeechOptions } from "../src/interfaces";

describe("Text-to-Speech (TTS) Module", () => {
  it("should configure voices, rate speed, and pitch options on provider", async () => {
    const provider = new DefaultTtsProvider();
    await provider.initialize();

    const voices = await provider.getAvailableVoices();
    expect(voices.length).toBeGreaterThan(0);

    const speakPromise = provider.speak("Hello test", {
      rate: 1.5,
      pitch: 1.2,
      volume: 0.8
    });
    
    await expect(speakPromise).resolves.toBeUndefined();
  });

  it("should queue multiple speech requests sequentially (FIFO)", async () => {
    const service = new TextToSpeechService();
    const playHistory: string[] = [];

    // Mock provider to track play sequences
    const mockProvider = {
      initialize: vi.fn().mockResolvedValue(undefined),
      speak: vi.fn().mockImplementation(async (text: string) => {
        playHistory.push(text);
        return new Promise<void>(resolve => setTimeout(resolve, 50));
      }),
      stop: vi.fn(),
      getAvailableVoices: vi.fn().mockResolvedValue([])
    };

    service.setProvider(mockProvider);

    // Queue multiple speech logs
    const p1 = service.queueSpeech("First request");
    const p2 = service.queueSpeech("Second request");
    const p3 = service.queueSpeech("Third request");

    await Promise.all([p1, p2, p3]);

    expect(playHistory).toEqual(["First request", "Second request", "Third request"]);
    expect(mockProvider.speak).toHaveBeenCalledTimes(3);
  });

  it("should immediately interrupt active playback and flush queue on demand", async () => {
    const service = new TextToSpeechService();
    const playHistory: string[] = [];

    const mockProvider = {
      initialize: vi.fn().mockResolvedValue(undefined),
      speak: vi.fn().mockImplementation(async (text: string) => {
        playHistory.push(text);
        return new Promise<void>(resolve => setTimeout(resolve, 100));
      }),
      stop: vi.fn(),
      getAvailableVoices: vi.fn().mockResolvedValue([])
    };

    service.setProvider(mockProvider);

    // Start long playback sequence
    service.queueSpeech("Long speech one");
    service.queueSpeech("Long speech two");

    // Small delay before interrupting
    await new Promise(resolve => setTimeout(resolve, 30));

    // Speak with interrupt = true
    await service.speak("Emergency alert", { interrupt: true });

    expect(mockProvider.stop).toHaveBeenCalled();
    expect(playHistory).toContain("Long speech one");
    // "Long speech two" should be flushed and never spoken
    expect(playHistory).not.toContain("Long speech two");
    expect(playHistory[playHistory.length - 1]).toBe("Emergency alert");
  });
});
