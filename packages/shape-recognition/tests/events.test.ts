import { describe, it, expect, vi } from "vitest";
import { ShapeRecognitionEventBus } from "../src/events";
import { ShapeRecognitionEvent } from "../src/events";

describe("ShapeRecognitionEventBus System", () => {
  it("should isolate subscriber execution errors gracefully (thread-safe dispatch)", () => {
    const bus = new ShapeRecognitionEventBus();

    const buggySubscriber = vi.fn().mockImplementation(() => {
      throw new Error("Subscriber crash");
    });
    const healthySubscriber = vi.fn();

    bus.subscribe("RecognitionCompleted", buggySubscriber);
    bus.subscribe("RecognitionCompleted", healthySubscriber);

    const event: ShapeRecognitionEvent = {
      type: "RecognitionCompleted",
      payload: {
        strokeId: "stroke-123",
        prediction: {
          shapeType: "circle",
          confidence: 0.95,
          recognitionTimeMs: 1.2,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          corners: [],
          vectorData: null,
          recognitionSource: "rules"
        }
      },
      timestamp: Date.now()
    };

    // Publish must succeed and notify healthySubscriber even if buggySubscriber crashes
    expect(() => bus.publish(event)).not.toThrow();
    expect(buggySubscriber).toHaveBeenCalledTimes(1);
    expect(healthySubscriber).toHaveBeenCalledTimes(1);
  });

  it("should support wildcard subscription filters", () => {
    const bus = new ShapeRecognitionEventBus();
    const wildcardSubscriber = vi.fn();
    const specificSubscriber = vi.fn();

    bus.subscribe("*", wildcardSubscriber);
    bus.subscribe("RecognitionFailed", specificSubscriber);

    const completedEvent: ShapeRecognitionEvent = {
      type: "RecognitionCompleted",
      payload: {
        strokeId: "stroke-123",
        prediction: {
          shapeType: "line",
          confidence: 0.9,
          recognitionTimeMs: 1.0,
          boundingBox: { x: 0, y: 0, width: 10, height: 10 },
          corners: [],
          vectorData: null,
          recognitionSource: "rules"
        }
      },
      timestamp: Date.now()
    };

    const failedEvent: ShapeRecognitionEvent = {
      type: "RecognitionFailed",
      payload: {
        strokeId: "stroke-456",
        reason: "Too noisy"
      },
      timestamp: Date.now()
    };

    bus.publish(completedEvent);
    bus.publish(failedEvent);

    expect(wildcardSubscriber).toHaveBeenCalledTimes(2);
    expect(specificSubscriber).toHaveBeenCalledTimes(1);
  });

  it("should support event replay for matching historical events", () => {
    const bus = new ShapeRecognitionEventBus();

    const initialEvent: ShapeRecognitionEvent = {
      type: "ShapeDetected",
      payload: {
        strokeId: "stroke-789",
        shapeType: "ellipse",
        confidence: 0.82
      },
      timestamp: Date.now()
    };

    bus.publish(initialEvent);

    const replaySubscriber = vi.fn();
    // Subscribe with replay option
    bus.subscribe("ShapeDetected", replaySubscriber, { replay: true });

    expect(replaySubscriber).toHaveBeenCalledTimes(1);
    expect(replaySubscriber.mock.calls[0][0].payload.strokeId).toBe("stroke-789");
  });

  it("should clear history and unsubscribe all listeners properly", () => {
    const bus = new ShapeRecognitionEventBus();
    const subscriber = vi.fn();

    bus.subscribe("*", subscriber);
    bus.publish({
      type: "ShapeRejected",
      payload: { strokeId: "1", shapeType: "unknown", confidence: 0.1, reason: "noise" },
      timestamp: Date.now()
    });

    expect(subscriber).toHaveBeenCalledTimes(1);

    bus.clearHistory();
    const lateSubscriber = vi.fn();
    bus.subscribe("ShapeRejected", lateSubscriber, { replay: true });
    expect(lateSubscriber).not.toHaveBeenCalled();

    bus.unsubscribeAll();
    bus.publish({
      type: "ShapeRejected",
      payload: { strokeId: "2", shapeType: "unknown", confidence: 0.1, reason: "noise" },
      timestamp: Date.now()
    });
    expect(subscriber).toHaveBeenCalledTimes(1); // Still 1 from before
  });
});
