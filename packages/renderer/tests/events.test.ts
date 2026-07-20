import { describe, it, expect, vi } from "vitest";
import { RendererEventBus } from "../src/events/bus";
import { RendererBusEvent } from "../src/events";

describe("Renderer Event Bus", () => {
  it("should dispatch events to matching subscribed callbacks", () => {
    const bus = new RendererEventBus();
    const mockCb = vi.fn();

    bus.subscribe("FrameStarted", mockCb);

    const event: RendererBusEvent = {
      type: "FrameStarted",
      payload: { frameIndex: 1, timestamp: 12345 },
      timestamp: 12345
    };

    bus.publish(event);

    expect(mockCb).toHaveBeenCalledTimes(1);
    expect(mockCb).toHaveBeenCalledWith(event);
  });

  it("should catch all events when subscribing with wildcard '*' identifier", () => {
    const bus = new RendererEventBus();
    const mockCb = vi.fn();

    bus.subscribe("*", mockCb);

    const event1: RendererBusEvent = {
      type: "FrameStarted",
      payload: { frameIndex: 1, timestamp: 100 },
      timestamp: 100
    };
    const event2: RendererBusEvent = {
      type: "CameraMoved",
      payload: { panX: 10, panY: 20, zoom: 1.0, rotation: 0 },
      timestamp: 110
    };

    bus.publish(event1);
    bus.publish(event2);

    expect(mockCb).toHaveBeenCalledTimes(2);
  });

  it("should replay historical events to late subscribers when option is set", () => {
    const bus = new RendererEventBus();
    const mockCb = vi.fn();

    const event1: RendererBusEvent = {
      type: "ViewportChanged",
      payload: { width: 800, height: 600, devicePixelRatio: 1 },
      timestamp: 200
    };
    const event2: RendererBusEvent = {
      type: "FrameDropped",
      payload: { frameIndex: 3, reason: "BudgetExceeded" },
      timestamp: 210
    };

    bus.publish(event1);
    bus.publish(event2);

    // Subscribe with replay option
    bus.subscribe("ViewportChanged", mockCb, { replay: true });

    // late subscriber must immediately receive historical ViewportChangedEvent!
    expect(mockCb).toHaveBeenCalledTimes(1);
    expect(mockCb).toHaveBeenCalledWith(event1);
  });

  it("should isolate subscriber exceptions and prevent publisher context crash", () => {
    const bus = new RendererEventBus();
    
    // Throwing callback
    bus.subscribe("SceneUpdated", () => {
      throw new Error("Subscriber failed!");
    });

    const mockCb = vi.fn();
    bus.subscribe("SceneUpdated", mockCb);

    const event: RendererBusEvent = {
      type: "SceneUpdated",
      payload: { nodeCount: 5 },
      timestamp: 300
    };

    // Publish should not throw
    expect(() => bus.publish(event)).not.toThrow();

    // Success callback must still run
    expect(mockCb).toHaveBeenCalledTimes(1);
  });
});
