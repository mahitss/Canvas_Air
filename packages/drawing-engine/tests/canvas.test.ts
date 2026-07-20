import { describe, it, expect, beforeEach } from "vitest";
import { ViewportTransform } from "../src/canvas/viewport";
import { DEFAULT_DRAWING_CONFIG } from "../src/config";

// Setup global or jsdom mock canvas element
class MockCanvas {
  public width = 0;
  public height = 0;
  public style = { width: "", height: "" };
  public getContext(mode: string) {
    return {
      setTransform: () => {},
      scale: () => {},
      clearRect: () => {}
    };
  }
}

describe("Infinite Canvas & Viewport Transform", () => {
  let viewport: ViewportTransform;

  beforeEach(() => {
    viewport = new ViewportTransform(DEFAULT_DRAWING_CONFIG);
  });

  it("should pan and zoom at an anchor screen point coordinate", () => {
    // Zoom at anchor (100, 100) by 2.0x factor
    viewport.zoomAt(100, 100, 2.0);

    const state = viewport.getState();
    expect(state.zoom).toBe(2.0);
    // Anchor point (100, 100) should project back to itself in world space
    const worldPt = viewport.screenToWorld(100, 100);
    expect(worldPt.x).toBeCloseTo(100, 1);
    expect(worldPt.y).toBeCloseTo(100, 1);
  });

  it("should enforce virtual bounds clamping when configured", () => {
    viewport.resize(200, 200, 1.0);
    viewport.setBounds({
      minX: -50,
      maxX: 50,
      minY: -50,
      maxY: 50
    });

    // Panning far to the right: center (100, 100) should clamp world centerX to 50
    viewport.pan(-500, 0);

    const worldCenter = viewport.screenToWorld(100, 100);
    expect(worldCenter.x).toBeLessThanOrEqual(50);
  });

  it("should manage High DPI scale configurations", () => {
    viewport.resize(400, 300, 2.0); // DPR = 2.0
    expect(viewport.getDevicePixelRatio()).toBe(2.0);

    // Coordinate transforms should stay scale-independent in CSS layouts space
    const screenPt = { x: 200, y: 150 };
    const worldPt = viewport.screenToWorld(screenPt.x, screenPt.y);
    const projected = viewport.worldToScreen(worldPt.x, worldPt.y);

    expect(projected.x).toBeCloseTo(screenPt.x, 3);
    expect(projected.y).toBeCloseTo(screenPt.y, 3);
  });
});
