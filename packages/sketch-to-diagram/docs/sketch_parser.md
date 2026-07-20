# Sketch Parser Specifications

This document describes the normalization and text-shape spatial bounding mapping rules implemented in the `SketchParser` class inside the `@visioncanvas/sketch-to-diagram` package.

---

## 1. Bounding Box Text Association Algorithm

To associate free text labels to their respective shapes (such as nodes in flowcharts or classes in UML diagrams):
1. The parser iterates over all extracted `text` elements.
2. For each text element, it searches the list of shapes to find enclosing bounding boxes:
   * A shape bounding box bounds the text if `text.x >= shape.x && text.x <= shape.x + shape.w` and `text.y >= shape.y && text.y <= shape.y + shape.h`.
3. **Innermost Shape Priority**: To handle nested shapes correctly (e.g., a circle contained within a larger box), shapes are sorted by area (`w * h`) ascending. The smallest containing shape is resolved first, ensuring labels map to the innermost target rather than parent blocks.

---

## 2. Containment Checks

To detect parent-child grouping hierarchy blocks:
1. The parser compares every shape against every other shape.
2. A shape `child` is contained inside a shape `parent` if its bounding box is entirely within the parent bounds:
   * `child.x > parent.x`
   * `child.x + child.w < parent.x + parent.w`
   * `child.y > parent.y`
   * `child.y + child.h < parent.y + parent.h`
3. Successfully matched containment pairs are pushed to `containments: { parentId, childId }[]`.

---

## 3. Spatial Connectors Mapping

* Raw vectors representing lines or arrows are analyzed by endpoints (`startX, startY` and `endX, endY`).
* Proximity metrics map the start and end coordinates to the center coordinates of the closest shapes within a configured threshold (default `50px`).
* Matched shapes are linked as a directed edge in the relationship graph.
