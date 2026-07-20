import { describe, it, expect, vi } from "vitest";
import { VoiceEventBus } from "../src/events/bus";
import { VoiceBusEvent } from "../events";

describe("Voice Command Event Bus", () => {
  it("should publish strongly typed events to subscribers asynchronously", async () => {
    const bus = new VoiceEventBus();
    const received: VoiceBusEvent[] = [];

    bus.subscribe("ListeningStarted", (e) => {
      received.push(e);
    });

    const event: VoiceBusEvent = {
      type: "ListeningStarted",
      payload: { timestamp: 12345 },
      timestamp: Date.now()
    };

    bus.publish(event);

    // Assert that the delivery is async (not immediate)
    expect(received).toHaveLength(0);

    // Wait for event loop task execution
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("ListeningStarted");
  });

  it("should isolate subscriber execution errors gracefully", async () => {
    const bus = new VoiceEventBus();
    const received: VoiceBusEvent[] = [];

    // Crashing subscriber
    bus.subscribe("WakeWordDetected", () => {
      throw new Error("Subscriber crash!");
    });

    // Healthy subscriber
    bus.subscribe("WakeWordDetected", (e) => {
      received.push(e);
    });

    const event: VoiceBusEvent = {
      type: "WakeWordDetected",
      payload: { wakeWord: "hey canvas", rawTranscript: "hey canvas" },
      timestamp: Date.now()
    };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    bus.publish(event);

    await new Promise((resolve) => setTimeout(resolve, 10));

    // The healthy subscriber still receives the event despite the first one throwing
    expect(received).toHaveLength(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should support wildcard subscriptions and historical event replays", () => {
    const bus = new VoiceEventBus();
    const replayList: VoiceBusEvent[] = [];

    const e1: VoiceBusEvent = {
      type: "SpeechRecognized",
      payload: { text: "draw a square", confidence: 0.95 },
      timestamp: Date.now()
    };

    const e2: VoiceBusEvent = {
      type: "VoiceError",
      payload: { error: "No microphone detected", code: "MIC_ERR" },
      timestamp: Date.now()
    };

    // Publish before subscription to fill history log
    bus.publish(e1);
    bus.publish(e2);

    // Subscribe with replay option
    bus.subscribe("*", (e) => {
      replayList.push(e);
    }, { replay: true });

    // Replay delivers historical records synchronously during subscription
    expect(replayList).toHaveLength(2);
    expect(replayList[0].type).toBe("SpeechRecognized");
    expect(replayList[1].type).toBe("VoiceError");
  });
});
