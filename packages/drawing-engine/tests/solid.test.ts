import { describe, it, expect, vi } from "vitest";
import { DrawingEngine } from "../src/engine";
import { DEFAULT_DRAWING_CONFIG } from "../src/config";
import { DrawingEventBus } from "../src/events";

describe("Drawing Engine SOLID and Dependency Inversion Tests", () => {
  it("should accept custom sub-module dependency overrides in constructor (DIP check)", () => {
    const mockLayers: any = {
      getActiveLayerId: vi.fn(() => "mock-layer-id"),
      getLayers: vi.fn(() => []),
      isDirty: vi.fn(() => false)
    };

    const mockHistory: any = {
      executeCommand: vi.fn(),
      clear: vi.fn()
    };

    const engine = new DrawingEngine(DEFAULT_DRAWING_CONFIG, {
      layers: mockLayers,
      history: mockHistory
    });

    expect(engine.layers).toBe(mockLayers);
    expect(engine.history).toBe(mockHistory);
  });

  it("should publish strongly-typed events to injected DrawingEventBus", () => {
    const eventBus = new DrawingEventBus();
    const eventLog: any[] = [];
    eventBus.subscribe("*", (evt) => {
      eventLog.push(evt);
    });

    const engine = new DrawingEngine(DEFAULT_DRAWING_CONFIG, { eventBus });
    
    // Setup canvas mock with drawImage
    const canvas = {
      width: 800,
      height: 600,
      style: { width: "800px", height: "600px" },
      getContext: () => ({
        setTransform: () => {},
        scale: () => {},
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        arc: () => {},
        fill: () => {},
        drawImage: () => {}
      })
    };
    engine.setCanvas(canvas as any);

    // 1. Start drawing
    engine.startStroke(100, 150);
    // There will be 2 events: LayerChanged (from setCanvas -> render) and StrokeStarted
    expect(eventLog.length).toBe(2);
    expect(eventLog[0].type).toBe("LayerChanged");
    expect(eventLog[1].type).toBe("StrokeStarted");
    expect(eventLog[1].payload.layerId).toBe(engine.layers.getActiveLayerId());

    // 2. Add points
    engine.addPoint(120, 160);
    expect(eventLog.length).toBe(3);
    expect(eventLog[2].type).toBe("StrokeUpdated");
    expect(eventLog[2].payload.pointsCount).toBe(2);

    // 3. Complete drawing
    engine.completeStroke();
    // Complete triggers: StrokeCompleted and CanvasChanged
    expect(eventLog.some(e => e.type === "StrokeCompleted")).toBe(true);
    expect(eventLog.some(e => e.type === "CanvasChanged")).toBe(true);

    // 4. Change active layer Visibility/Dirty to trigger LayerChanged on render
    const initialLayerId = engine.layers.getActiveLayerId()!;
    const nextLayer = engine.layers.addLayer("Second Layer");
    engine.layers.setActiveLayer(nextLayer.id);
    engine.render();

    expect(eventLog.some(e => e.type === "LayerChanged" && e.payload.activeLayerId === nextLayer.id)).toBe(true);
  });
});
