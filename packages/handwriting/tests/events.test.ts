import { describe, it, expect, vi } from "vitest";
import { HandwritingEventBus } from "../src/events/bus";
import { RecognitionStartedEvent, TextCorrectedEvent } from "../src/events";

describe("Handwriting Recognition Event Bus", () => {
  it("should publish and subscribe to strongly typed recognition events", () => {
    const bus = new HandwritingEventBus();
    const callback = vi.fn();

    bus.subscribe("RecognitionStarted", callback);

    const event: RecognitionStartedEvent = {
      type: "RecognitionStarted",
      payload: { sessionId: "session_1", strokeIds: ["stroke_1"] },
      timestamp: Date.now()
    };

    bus.publish(event);

    expect(callback).toHaveBeenCalledWith(event);
  });

  it("should replay historical events upon matching subscription options", () => {
    const bus = new HandwritingEventBus();
    const callback = vi.fn();

    const startEvent: RecognitionStartedEvent = {
      type: "RecognitionStarted",
      payload: { sessionId: "session_1", strokeIds: ["stroke_1"] },
      timestamp: Date.now()
    };

    const correctedEvent: TextCorrectedEvent = {
      type: "TextCorrected",
      payload: {
        sessionId: "session_1",
        originalText: "hllo",
        correctedText: "hello",
        confidence: 0.95
      },
      timestamp: Date.now()
    };

    bus.publish(startEvent);
    bus.publish(correctedEvent);

    // Subscribe to TextCorrected with replay
    bus.subscribe("TextCorrected", callback, { replay: true });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(correctedEvent);

    // Subscribe to all (*) with replay
    const allCallback = vi.fn();
    bus.subscribe("*", allCallback, { replay: true });
    expect(allCallback).toHaveBeenCalledTimes(2);
  });

  it("should isolate subscriber execution crashes gracefully without blocking other listeners", () => {
    const bus = new HandwritingEventBus();
    const failingCallback = vi.fn().mockImplementation(() => {
      throw new Error("Crash");
    });
    const succeedingCallback = vi.fn();

    bus.subscribe("RecognitionStarted", failingCallback);
    bus.subscribe("RecognitionStarted", succeedingCallback);

    const event: RecognitionStartedEvent = {
      type: "RecognitionStarted",
      payload: { sessionId: "session_2", strokeIds: [] },
      timestamp: Date.now()
    };

    // Publish event - shouldn't throw error
    expect(() => bus.publish(event)).not.toThrow();

    expect(failingCallback).toHaveBeenCalledWith(event);
    expect(succeedingCallback).toHaveBeenCalledWith(event);
  });
});
