import { describe, it, expect } from "vitest";
import { Camera2D } from "../src/camera/camera";

describe("Camera System Advanced Operations", () => {
  it("should round-trip coordinate space mappings between client screen and world space", () => {
    const camera = new Camera2D(800, 600);
    camera.panX = 150;
    camera.panY = 250;
    camera.zoom = 2.0;
    camera.rotation = 45; // 45 degrees

    const worldPt = { x: 100, y: 50 };
    const screenPt = camera.worldToClient(worldPt.x, worldPt.y);

    const reconstructedWorld = camera.clientToWorld(screenPt.x, screenPt.y);
    expect(reconstructedWorld.x).toBeCloseTo(worldPt.x, 3);
    expect(reconstructedWorld.y).toBeCloseTo(worldPt.y, 3);
  });

  it("should clamp zoom scale factor and pan translation inside configured limits bounds", () => {
    const camera = new Camera2D(800, 600);
    camera.minZoom = 0.5;
    camera.maxZoom = 4.0;

    camera.panBounds = { xMin: -100, yMin: -100, xMax: 500, yMax: 500 };

    // Zoom clamp checks
    camera.zoomTo(0.1);
    camera.snapToTargets();
    expect(camera.zoom).toBe(0.5);

    camera.zoomTo(10.0);
    camera.snapToTargets();
    expect(camera.zoom).toBe(4.0);

    // Pan boundary clamp checks
    camera.pan(-999, -999);
    camera.snapToTargets();
    expect(camera.panX).toBe(-100);
    expect(camera.panY).toBe(-100);

    camera.pan(999, 999);
    camera.snapToTargets();
    expect(camera.panX).toBe(500);
    expect(camera.panY).toBe(500);
  });

  it("should execute smooth transitions towards coordinates target during updates LERP ticks", () => {
    const camera = new Camera2D(800, 600);
    camera.panX = 0;
    camera.panY = 0;
    camera.zoom = 1.0;

    camera.pan(200, 100);
    camera.zoomTo(2.0);

    // LERP updates
    camera.update(100); // 100ms passing tick

    // Current coordinates should have progressed towards targets
    expect(camera.panX).toBeGreaterThan(0);
    expect(camera.panX).toBeLessThan(200);

    expect(camera.zoom).toBeGreaterThan(1.0);
    expect(camera.zoom).toBeLessThan(2.0);

    // Bypassing transitions
    camera.snapToTargets();
    expect(camera.panX).toBe(200);
    expect(camera.panY).toBe(100);
    expect(camera.zoom).toBe(2.0);
  });

  it("should pivot zoom calculations relative to canvas client coordinate anchor", () => {
    const camera = new Camera2D(800, 600);
    camera.panX = 0;
    camera.panY = 0;
    camera.zoom = 1.0;
    camera.snapToTargets();

    const pivotX = 400;
    const pivotY = 300;

    camera.zoomAround(pivotX, pivotY, 2.0);
    camera.snapToTargets();

    expect(camera.zoom).toBe(2.0);
    
    // Zooming in centered at screen coordinate (400, 300) with scale 2.0
    // should displace the pan offset so that the pivot point remains centered.
    // Let's assert coordinates:
    const remappedPivot = camera.worldToClient(pivotX, pivotY);
    // Since pivot point is relative, worldToClient should resolve back to exact same screen coordinate!
    expect(remappedPivot.x).toBeCloseTo(pivotX, 3);
    expect(remappedPivot.y).toBeCloseTo(pivotY, 3);
  });
});
