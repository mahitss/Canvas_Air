import { describe, it, expect } from "vitest";
import { LayerManager } from "../src/layer/manager";
import { SceneGraph } from "../src/scene/graph";
import { SceneNode } from "../src/scene/node";
import { ILayer } from "../src/interfaces";

describe("Layer Manager and Rendering Layers", () => {
  it("should add layers and retrieve them sorted in ascending zIndex order", () => {
    const manager = new LayerManager();

    const layer1: ILayer = { id: "ui", name: "UI", type: "UI", visible: true, opacity: 1.0, zIndex: 100 };
    const layer2: ILayer = { id: "bg", name: "Background", type: "Background", visible: true, opacity: 1.0, zIndex: 0 };
    const layer3: ILayer = { id: "draw", name: "Drawing", type: "Drawing", visible: true, opacity: 1.0, zIndex: 50 };

    manager.addLayer(layer1);
    manager.addLayer(layer2);
    manager.addLayer(layer3);

    const sorted = manager.getLayers();
    expect(sorted).toHaveLength(3);
    expect(sorted[0].id).toBe("bg");
    expect(sorted[1].id).toBe("draw");
    expect(sorted[2].id).toBe("ui");
  });

  it("should toggle layer visibility and sync states to corresponding SceneNodes", () => {
    const graph = new SceneGraph();
    const manager = new LayerManager(graph);

    const layer: ILayer = { id: "drawing-layer", name: "Draw", type: "Drawing", visible: true, opacity: 1.0, zIndex: 10 };
    manager.addLayer(layer);

    const node = manager.getLayerNode("drawing-layer")!;
    expect(node.isVisible).toBe(true);

    manager.setLayerVisibility("drawing-layer", false);
    expect(manager.getLayerById("drawing-layer")!.visible).toBe(false);
    expect(node.isVisible).toBe(false);
  });

  it("should apply layer opacity and propagate multiplication down the SceneNode hierarchy", () => {
    const graph = new SceneGraph();
    const manager = new LayerManager(graph);

    const layer: ILayer = { id: "shapes-layer", name: "Shapes", type: "Shapes", visible: true, opacity: 0.8, zIndex: 20 };
    manager.addLayer(layer);

    const layerNode = manager.getLayerNode("shapes-layer")!;
    expect(layerNode.opacity).toBe(0.8);

    const shapeItem = new SceneNode("circle");
    shapeItem.opacity = 0.5;
    layerNode.addChild(shapeItem);

    // Absolute hierarchy opacity should multiply (0.8 * 0.5 = 0.40)
    expect(shapeItem.getWorldOpacity()).toBeCloseTo(0.40, 5);

    // Update layer opacity
    manager.setLayerOpacity("shapes-layer", 0.5);
    expect(shapeItem.getWorldOpacity()).toBeCloseTo(0.25, 5);
  });

  it("should sort children in the SceneGraph according to zIndex weights", () => {
    const graph = new SceneGraph();
    const manager = new LayerManager(graph);

    const layer1: ILayer = { id: "ui", name: "UI", type: "UI", visible: true, opacity: 1.0, zIndex: 100 };
    const layer2: ILayer = { id: "bg", name: "Background", type: "Background", visible: true, opacity: 1.0, zIndex: 0 };
    const layer3: ILayer = { id: "draw", name: "Drawing", type: "Drawing", visible: true, opacity: 1.0, zIndex: 50 };

    // Added out of order
    manager.addLayer(layer1);
    manager.addLayer(layer3);
    manager.addLayer(layer2);

    const rootChildren = graph.getRoot().children;
    expect(rootChildren[0].id).toBe("bg");
    expect(rootChildren[1].id).toBe("draw");
    expect(rootChildren[2].id).toBe("ui");
  });
});
