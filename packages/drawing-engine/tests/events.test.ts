import { describe, it, expect } from "vitest";
import { DrawingEventBus, DrawingBusEvent } from "../src/events";

describe("DrawingEventBus System", () => {
  const createStrokeStarted = (strokeId: string, layerId: string): DrawingBusEvent => ({
    type: "StrokeStarted",
    payload: { strokeId, layerId },
    timestamp: Date.now()
  });

  const createStrokeCompleted = (strokeId: string, pointsCount: number): DrawingBusEvent => ({
    type: "StrokeCompleted",
    payload: { strokeId, pointsCount },
    timestamp: Date.now()
  });

  it("should publish and subscribe to strongly typed drawing events", () => {
    const bus = new DrawingEventBus();
    const received: DrawingBusEvent[] = [];

    bus.subscribe("StrokeStarted", (event) => received.push(event));

    const ev = createStrokeStarted("s1", "l1");
    bus.publish(ev);

    expect(received.length).toBe(1);
    expect(received[0]!.type).toBe("StrokeStarted");
    expect((received[0] as any).payload.strokeId).toBe("s1");
  });

  it("should support wildcard subscriptions receiving all events", () => {
    const bus = new DrawingEventBus();
    const received: DrawingBusEvent[] = [];

    bus.subscribe("*", (event) => received.push(event));

    bus.publish(createStrokeStarted("s1", "l1"));
    bus.publish(createStrokeCompleted("s1", 12));

    expect(received.length).toBe(2);
    expect(received[0]!.type).toBe("StrokeStarted");
    expect(received[1]!.type).toBe("StrokeCompleted");
  });

  it("should isolate subscriber execution errors gracefully", () => {
    const bus = new DrawingEventBus();
    let invoked = false;

    // Bad subscriber that throws
    bus.subscribe("StrokeStarted", () => {
      throw new Error("Failure");
    });

    // Good subscriber that must still be invoked
    bus.subscribe("StrokeStarted", () => {
      invoked = true;
    });

    bus.publish(createStrokeStarted("s1", "l1"));
    expect(invoked).toBe(true);
  });

  it("should replay historical events to new subscribers on demand", () => {
    const bus = new DrawingEventBus(20);
    const received: DrawingBusEvent[] = [];

    bus.publish(createStrokeStarted("s1", "l1"));
    bus.publish(createStrokeCompleted("s1", 5));

    // Subscribe with replay enabled
    bus.subscribe("StrokeCompleted", (event) => received.push(event), { replay: true });

    expect(received.length).toBe(1);
    expect(received[0]!.type).toBe("StrokeCompleted");
    expect((received[0] as any).payload.pointsCount).toBe(5);
  });

  it("should unsubscribe listener via returned callback hook", () => {
    const bus = new DrawingEventBus();
    let count = 0;

    const unsubscribe = bus.subscribe("StrokeStarted", () => {
      count++;
    });

    bus.publish(createStrokeStarted("s1", "l1"));
    unsubscribe();
    bus.publish(createStrokeStarted("s2", "l1"));

    expect(count).toBe(1);
  });
});
