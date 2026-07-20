# VisionCanvas AI: Shape Recognition SDK Documentation

The **AI Shape Recognition Engine** (`@visioncanvas/shape-recognition`) acts as the real-time drawing analyzer for VisionCanvas AI. It simplifies raw hand gestures or finger coordinates paths, extracts structural parameters, classifies drawings against registered templates and rules, and spawns mathematically corrected vectors.

---

## 1. System Architecture

```
                       +-----------------------------------+
                       |     ShapeRecognitionPipeline      |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |    DouglasPeuckerSimplifier       |
                       |    (Noise reduction eps split)    |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |        FeatureExtractor           |
                       | (Shoelace area, centroids, closed)|
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          Classifiers              |
                       |  (Dollar Template & Rules Engine) |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |         SnappingEngine            |
                       |    (Grid alignment / Snap angle)  |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |         VectorEngine              |
                       |   (Outputs circle, rectangle, etc) |
                       +-----------------------------------+
```

---

## 2. Simplification & Dollar Template Algorithms

1.  **Ramer-Douglas-Peucker (RDP)**:
    Reduces polyline points density by recursively checking perpendicular distances from intermediate nodes to segment paths. If the maximum distance from node $P_i$ to segment $P_1P_2$ is less than threshold tolerance $\epsilon$, intermediate coordinates are discarded.

2.  **Dollar ($1) Recognizer resampling**:
    Enables gesture classification independent of scale and location:
    *   **Resample**: Interpolates coordinate spacing into exactly $N=64$ points.
    *   **Rotate**: Rotates the candidate path around its centroid to align the starting point angle with the positive X-axis ($0.0$ radians).
    *   **Scale**: Standardizes shape scale into $250 \times 250$ pixel box bounds.
    *   **Distance Match**: Calculates the average Euclidean distance between matching indices of candidate points $C_i$ and template points $T_i$:
        $$d_{\text{match}} = \frac{1}{N} \sum_{i=1}^N \|C_i - T_i\|$$

---

## 3. Heuristic Rules

Complementing Dollar templates, rule checks verify specific geometric values:

*   **Circularity Index**:
    $$\text{Circularity} = \frac{4\pi \cdot \text{Area}}{\text{Perimeter}^2}$$
    Circularity $> 0.72$ maps coordinates to a `circle` (if aspect ratio is balanced) or an `ellipse` (if aspect ratio is skewed).
*   **Straight Line**:
    Checks if start-to-end distance relative to the cumulative perimeter matches $\ge 0.96$.
