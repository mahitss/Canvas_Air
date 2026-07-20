# VisionCanvas AI: Graphics & Rendering SDK Documentation

The **Graphics & Rendering Engine** (`@visioncanvas/renderer`) acts as the core presentation pipeline responsible for drawing the canvas state, layers, dynamic strokes, and visual widgets inside VisionCanvas AI.

---

## 1. System Architecture

```
                       +-----------------------------------+
                       |           RenderPipeline          |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |           SceneGraph              |
                       |  (Root, Layer, Stroke, UI Nodes)  |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |            Camera2D               |
                       | (Pan, Zoom, Rotate, Frustum Cull) |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |         FrameScheduler            |
                       |   (120 FPS / Budget Limiter)      |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          RenderPasses             |
                       |  (Geometry, PostProcess, Debug)   |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |       GPUResourceManager          |
                       |  (WebGL program/texture caches)   |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |      PostProcessPipeline          |
                       |     (Bloom, Vignette Filters)     |
                       +-----------------------------------+
```

---

## 2. Scene Graph Transformations

Every `SceneNode` computes its local transformation matrix from scale, rotation, and translation components.

$$M_{\text{local}} = \text{Translation}(T_x, T_y) \times \text{Rotation}(\theta) \times \text{Scale}(S_x, S_y)$$

The world matrix is computed recursively:

$$W_{\text{node}} = W_{\text{parent}} \times M_{\text{local}}$$

---

## 3. Render Passes Setup

The pipeline coordinates rendering using prioritized rendering layers/passes:

1.  **GeometryPass (Priority 10)**: Traverses the Scene Graph, performs camera boundary frustum culling, and renders visible path nodes.
2.  **PostProcessPass (Priority 20)**: Composites pixel overlays such as Vignette masks and screen-based light blooms. Automatically skipped if the Frame Scheduler flags a frame timing budget overrun.
3.  **DebugPass (Priority 30)**: Draws on-screen indicators (FPS, CPU frame timing delta, cull ratios, buffer memory footprints).
