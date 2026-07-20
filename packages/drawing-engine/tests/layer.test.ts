import { describe, it, expect, beforeEach } from "vitest";
import { LayerManager } from "../src/layer/manager";
import { DEFAULT_DRAWING_CONFIG } from "../src/config";

describe("Layer Manager Service", () => {
  let manager: LayerManager;

  beforeEach(() => {
    manager = new LayerManager(DEFAULT_DRAWING_CONFIG);
  });

  it("should initialize with a base background layer", () => {
    const layers = manager.getLayers();
    expect(layers.length).toBe(1);
    expect(layers[0]!.name).toBe("Background Layer");
    expect(layers[0]!.blendMode).toBe("source-over");
    expect(layers[0]!.opacity).toBe(1.0);
    expect(layers[0]!.isVisible).toBe(true);
    expect(layers[0]!.isLocked).toBe(false);
  });

  it("should support creating and active layer toggling", () => {
    const layer = manager.addLayer("Foreground Line Art");
    expect(manager.getLayers().length).toBe(2);
    expect(layer.name).toBe("Foreground Line Art");

    manager.setActiveLayer(layer.id);
    expect(manager.getActiveLayerId()).toBe(layer.id);
  });

  it("should support renaming layers", () => {
    const layer = manager.addLayer("Layer 1");
    manager.renameLayer(layer.id, "Sketches");
    
    const retrieved = manager.getLayers().find(l => l.id === layer.id);
    expect(retrieved!.name).toBe("Sketches");
  });

  it("should support reordering layers", () => {
    const l1 = manager.getLayers()[0]!;
    const l2 = manager.addLayer("Layer 2");
    const l3 = manager.addLayer("Layer 3");

    // Order initially: [l1, l2, l3]
    manager.reorderLayer(l3.id, 0);
    // Order now: [l3, l1, l2]
    const layers = manager.getLayers();
    expect(layers[0]!.id).toBe(l3.id);
    expect(layers[1]!.id).toBe(l1.id);
    expect(layers[2]!.id).toBe(l2.id);
  });

  it("should support visibility, lock, opacity, and blend mode toggles", () => {
    const layer = manager.addLayer("Color Fills");
    manager.setLayerVisibility(layer.id, false);
    manager.setLayerLock(layer.id, true);
    manager.setLayerOpacity(layer.id, 0.6);
    manager.setLayerBlendMode(layer.id, "multiply");

    const retrieved = manager.getLayers().find(l => l.id === layer.id)!;
    expect(retrieved.isVisible).toBe(false);
    expect(retrieved.isLocked).toBe(true);
    expect(retrieved.opacity).toBeCloseTo(0.6, 2);
    expect(retrieved.blendMode).toBe("multiply");
  });

  it("should prevent deleting the last remaining layer", () => {
    const layers = manager.getLayers();
    expect(() => manager.removeLayer(layers[0]!.id)).toThrowError(
      "Cannot delete the last layer in canvas."
    );
  });

  it("should handle active layer fallback when deleted", () => {
    const l1 = manager.getLayers()[0]!;
    const l2 = manager.addLayer("Layer 2");
    manager.setActiveLayer(l2.id);

    manager.removeLayer(l2.id);
    expect(manager.getActiveLayerId()).toBe(l1.id);
  });
});
