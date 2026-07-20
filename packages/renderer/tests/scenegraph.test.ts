import { describe, it, expect } from "vitest";
import { SceneGraph, SceneNode } from "../src/scene/graph";

describe("Scene Graph Optimizations & Features", () => {
  it("should lazy evaluate world transforms and cascade dirty flag states to child nodes", () => {
    const graph = new SceneGraph();
    const parent = new SceneNode("parent");
    const child = new SceneNode("child");

    graph.getRoot().addChild(parent);
    parent.addChild(child);

    // Initial evaluation caches matrices
    const parentWt1 = parent.getWorldTransform();
    const childWt1 = child.getWorldTransform();

    // Modifying parent transform propagates dirty state down the hierarchy tree
    parent.translateX = 50;

    // Direct read caches must recompute
    const parentWt2 = parent.getWorldTransform();
    const childWt2 = child.getWorldTransform();

    expect(parentWt2[2]).toBe(50); // updated
    expect(childWt2[2]).toBe(50);  // child inherited translation update
    expect(parentWt1).not.toBe(parentWt2);
    expect(childWt1).not.toBe(childWt2);
  });

  it("should calculate absolute world visibility and opacity levels hierarchically", () => {
    const parent = new SceneNode("parent");
    parent.opacity = 0.5;

    const child = new SceneNode("child");
    child.opacity = 0.5;

    parent.addChild(child);

    // Assert multiplied opacity resolving (0.5 * 0.5 = 0.25)
    expect(child.getWorldOpacity()).toBe(0.25);

    // Visibility checks
    expect(child.getWorldVisibility()).toBe(true);
    parent.isVisible = false;
    expect(child.getWorldVisibility()).toBe(false); // inherits parent invisible flag
  });

  it("should resolve topmost overlapping node elements first during hit testing checks", () => {
    const graph = new SceneGraph();
    
    // Parent boundary covering rect
    const layer = new SceneNode("layer");
    layer.localBounds = { xMin: 0, yMin: 0, xMax: 500, yMax: 500 };
    graph.getRoot().addChild(layer);

    // Background selection item (zIndex implicitly ordered by order added in DFS)
    const bgItem = new SceneNode("bg-item");
    bgItem.localBounds = { xMin: 50, yMin: 50, xMax: 150, yMax: 150 };
    layer.addChild(bgItem);

    // Foreground overlay item (drawn after bgItem, so overlaps it on screen)
    const fgItem = new SceneNode("fg-item");
    fgItem.localBounds = { xMin: 100, yMin: 100, xMax: 200, yMax: 200 };
    layer.addChild(fgItem);

    // Hit-testing point at (120, 120) overlaps both bgItem and fgItem
    const hit = graph.hitTest(120, 120);
    // Topmost child fgItem must resolve as the primary hit target!
    expect(hit!.id).toBe("fg-item");

    // Hit-testing point at (60, 60) only overlaps bgItem
    const hitBg = graph.hitTest(60, 60);
    expect(hitBg!.id).toBe("bg-item");
  });

  it("should support selection flag state toggles", () => {
    const node = new SceneNode("node");
    expect(node.isSelected).toBe(false);
    node.isSelected = true;
    expect(node.isSelected).toBe(true);
  });
});
