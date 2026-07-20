import { describe, it, expect, beforeEach } from "vitest";
import { BrushManager, BaseBrush } from "../src/brush";
import { DEFAULT_DRAWING_CONFIG } from "../src/config";
import { DrawingPoint } from "../src/types";

// Mock custom brush for plugin validation
class RainbowPluginBrush extends BaseBrush {
  public drawSegment(ctx: CanvasRenderingContext2D, p0: DrawingPoint, p1: DrawingPoint): void {
    ctx.strokeStyle = "violet";
    ctx.lineWidth = this.width;
    ctx.stroke();
  }
}

describe("Brush System & Plugin Framework", () => {
  let manager: BrushManager;

  beforeEach(() => {
    manager = new BrushManager(DEFAULT_DRAWING_CONFIG);
  });

  it("should initialize default standard brushes and details", () => {
    const pen = manager.getBrush("Pen");
    expect(pen).toBeDefined();
    expect(pen!.name).toBe("Pen");
    expect(pen!.flow).toBe(1.0);
    expect(pen!.hardness).toBe(0.5);

    const airbrush = manager.getBrush("Airbrush");
    expect(airbrush).toBeDefined();
    expect(airbrush!.name).toBe("Airbrush");
    expect(airbrush!.flow).toBe(0.8);
    expect(airbrush!.hardness).toBe(0.2);
  });

  it("should configure global properties of brushes", () => {
    manager.setBrushColor("#00ff00");
    const pen = manager.getBrush("Pen")!;
    expect(pen.color).toBe("#00ff00");

    manager.setActiveBrush("Airbrush");
    manager.setBrushWidth(12);
    const active = manager.getActiveBrush();
    expect(active.name).toBe("Airbrush");
    expect(active.size).toBe(12); // size maps to width
  });

  it("should support dynamic registration of custom plugin brushes", () => {
    const custom = new RainbowPluginBrush("Rainbow", "#ffffff", 10, 1.0, true, 0.9, 0.4);
    manager.registerBrush(custom);

    const retrieved = manager.getBrush("Rainbow");
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe("Rainbow");
    expect(retrieved!.flow).toBe(0.9);
    expect(retrieved!.hardness).toBe(0.4);

    manager.setActiveBrush("Rainbow");
    expect(manager.getActiveBrush().name).toBe("Rainbow");
  });
});
