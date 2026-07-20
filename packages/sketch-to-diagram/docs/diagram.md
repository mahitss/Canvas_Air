# VisionCanvas AI: AI Sketch-to-Diagram SDK Documentation

The **AI Sketch-to-Diagram Engine** (`@visioncanvas/sketch-to-diagram`) converts freehand drawings into clean, structured vector diagrams (flowcharts, mindmaps, UML class diagrams).

---

## 1. System Pipeline Architecture

```
                       +-----------------------------------+
                       |       SketchToDiagramEngine       |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |         SemanticAnalyzer          |
                       | (Proximity coordinates mapping)   |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |           LayoutEngine            |
                       |     (Node layering planner)       |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |           GraphEngine             |
                       |     (Topology validation)         |
                       +-----------------------------------+
```

---

## 2. Geometric Proximity Connection Mappings

Arrow/connector line coordinates $E$ are mapped to adjacent box nodes $N_1$ and $N_2$ if start/end points reside within range:
$$\operatorname{dist}(E_{\text{start}}, N_1) < \text{proximityThreshold} \quad \text{and} \quad \operatorname{dist}(E_{\text{end}}, N_2) < \text{proximityThreshold}$$
When both conditions hold, a directed edge `Edge(N_1 -> N_2)` is added to the diagram graph representation.

---

## 3. Auto Layout Planners

Auto layouts position coordinates topologically:
*   **Hierarchical (flowcharts/UML)**: Nodes are structured into layer ranks, assigning layered $Y$ and non-overlapping spaced $X$ offsets.
*   **Radial (mindmaps)**: Concentric step layout expanding outwards at step angle:
    $$\theta_i = i \times \frac{2\pi}{K}$$
