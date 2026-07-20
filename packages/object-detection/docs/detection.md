# VisionCanvas AI: Object Detection & Scene Understanding SDK Documentation

The **Object Detection & Scene Understanding Platform** (`@visioncanvas/object-detection`) tracks persistent objects centroids, extracts instance outlines contour masks, and builds spatial scene graphs.

---

## 1. System Pipeline Architecture

```
                       +-----------------------------------+
                       |       ObjectDetectionEngine       |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |         TrackingEngine            |
                       | (Persistent centroid tracking)    |
                       +--------+--------+--------+--------+
                                |        |        |
            +-------------------+        |        +-------------------+
            |                            |                            |
            v                            v                            v
  +------------------+         +------------------+         +------------------+
  |SegmentationEngine|         |SceneGraphManager |         |   AI providers   |
  |  (Outline masks) |         | (Spatial graphs) |         |  (Local/Cloud)   |
  +------------------+         +------------------+         +------------------+
```

---

## 2. Temporal Centroid Trackings

Detections are matched across frame sequences by assessing centroid offsets $D(O_i, O_j)$ and bounding box Intersection-over-Union (IoU) scores:
$$\operatorname{IoU}(A, B) = \frac{\operatorname{Area}(A \cap B)}{\operatorname{Area}(A \cup B)}$$
If IoU matches exceed threshold boundaries, the persistence tracking ID is maintained.

---

## 3. Spatial Relationships Manager

Relative positions are classified geometrically:
*   **Containment**: $\operatorname{Box}(A) \subseteq \operatorname{Box}(B)$
*   **Overlap**: $\operatorname{Box}(A) \cap \operatorname{Box}(B) \ne \emptyset \quad \land \quad \neg \text{Containment}$
*   **Adjacency**: Border distance is below `spatialAdjacencyThreshold`.
