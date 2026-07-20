import { describe, it, expect, vi } from "vitest";
import { VoiceEventBus } from "../src/events/bus";
import { VoicePlatformBridge, IMinimalPlatformEventBus } from "../src/integration/bridge";
import { VoiceBusEvent } from "../events";

describe("Voice Command Engine Platform Integration Bridge", () => {
  it("should subscribe, track start status, map command results, and publish onto mock platform bus", async () => {
    const voiceBus = new VoiceEventBus();
    const mockPlatformEvents: any[] = [];

    const mockPlatformBus: IMinimalPlatformEventBus = {
      publish: vi.fn().mockImplementation((e) => {
        mockPlatformEvents.push(e);
      })
    };

    const bridge = new VoicePlatformBridge(voiceBus, mockPlatformBus);
    
    expect(bridge.isRunning()).toBe(false);
    bridge.start();
    expect(bridge.isRunning()).toBe(true);

    const parsedEvent: VoiceBusEvent = {
      type: "CommandParsed",
      payload: {
        result: {
          intent: "create",
          entities: { shapeName: "circle" },
          rawTranscript: "draw a circle",
          confidence: 0.90,
          executionTimeMs: 12.5
        }
      },
      timestamp: Date.now()
    };

    // Publish command parsed event onto voice bus
    voiceBus.publish(parsedEvent);

    // Assert that the delivery onto platform bus is async (not immediate)
    expect(mockPlatformBus.publish).not.toHaveBeenCalled();

    // Wait for async task execution
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockPlatformBus.publish).toHaveBeenCalledTimes(1);
    expect(mockPlatformEvents[0].type).toBe("PLATFORM_VOICE_COMMAND");
    expect(mockPlatformEvents[0].payload.intent).toBe("create");
    expect(mockPlatformEvents[0].payload.entities.shapeName).toBe("circle");
    expect(mockPlatformEvents[0].payload.confidence).toBe(0.90);

    bridge.stop();
    expect(bridge.isRunning()).toBe(false);
  });
});
