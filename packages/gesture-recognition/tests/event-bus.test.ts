import { describe, it, expect, beforeEach, vi } from "vitest";
import { GestureEventBus } from "../src/event-bus";
import { GestureBusEvent } from "../src/types";

describe("Gesture Event Bus", () => {
  let bus: GestureEventBus;

  beforeEach(() => {
    bus = new GestureEventBus(10);
  });

  const createMockEvent = (type: any, gesture: string): GestureBusEvent => ({
    type,
    payload: {
      handId: "hand-1",
      gesture,
      confidence: 0.9,
      timestamp: Date.now()
    }
  });

  it("should deliver events to directly subscribed listeners", () => {
    const spy = vi.fn();
    bus.subscribe("GestureStarted", spy);

    const startedEv = createMockEvent("GestureStarted", "Pinch");
    const updatedEv = createMockEvent("GestureUpdated", "Pinch");

    bus.publish(startedEv);
    bus.publish(updatedEv);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(startedEv);
  });

  it("should deliver all events to wildcard subscribers", () => {
    const spy = vi.fn();
    bus.subscribe("*", spy);

    bus.publish(createMockEvent("GestureStarted", "Pinch"));
    bus.publish(createMockEvent("GestureCompleted", "Pinch"));

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("should stop delivering events after unsubscription", () => {
    const spy = vi.fn();
    const unsubscribe = bus.subscribe("GestureStarted", spy);

    bus.publish(createMockEvent("GestureStarted", "Pinch"));
    expect(spy).toHaveBeenCalledTimes(1);

    unsubscribe();
    bus.publish(createMockEvent("GestureStarted", "Pinch"));
    expect(spy).toHaveBeenCalledTimes(1); // No new deliveries
  });

  it("should replay buffered historical events to new subscribers with replay option enabled", () => {
    const ev1 = createMockEvent("GestureStarted", "Pinch");
    const ev2 = createMockEvent("GestureCompleted", "Pinch");
    const ev3 = createMockEvent("GestureFailed", "Pinch");

    bus.publish(ev1);
    bus.publish(ev2);
    bus.publish(ev3);

    const spy = vi.fn();
    // Subscribe to GestureCompleted with replay
    bus.subscribe("GestureCompleted", spy, { replay: true });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(ev2);
  });

  it("should isolate subscriber errors and prevent dispatch pipeline blockages", () => {
    const failingSpy = vi.fn().mockImplementation(() => {
      throw new Error("Subscriber crash");
    });
    const healthySpy = vi.fn();

    bus.subscribe("GestureStarted", failingSpy);
    bus.subscribe("GestureStarted", healthySpy);

    expect(() => {
      bus.publish(createMockEvent("GestureStarted", "Pinch"));
    }).not.toThrow();

    expect(failingSpy).toHaveBeenCalled();
    expect(healthySpy).toHaveBeenCalled(); // Healthy subscriber still runs successfully
  });
});
