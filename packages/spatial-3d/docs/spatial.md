# VisionCanvas AI: Spatial Computing & 3D Canvas Engine SDK Documentation

The **Spatial Computing & 3D Canvas Engine** (`@visioncanvas/spatial-3d`) implements coordinate system matrices, parent-child scene graph node relationships, persistent anchors, and raycast picks.

---

## 1. System Pipeline Architecture

```
                       +-----------------------------------+
                       |           SceneGraph3D            |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |            MatrixMath             |
                       |  (World/Local matrix transform)   |
                       +--------+--------+--------+--------+
                                |        |        |
            +-------------------+        |        +-------------------+
            |                            |                            |
            v                            v                            v
  +------------------+         +------------------+         +------------------+
  |  AnchorManager   |         |SpatialInteraction|         |  XR Input Devices |
  | (Real-world lock)|         | (Raycast picking)|         | (AR/VR Devices)   |
  +------------------+         +------------------+         +------------------+
```

---

## 2. Hierarchical Coordinate Transforms

A child node world transform matrix $W_N$ accumulates translation $T$, rotation $R$, and scale $S$ matrix vectors:
$$L_N = T \times R \times S$$
$$W_N = W_P \times L_N$$
where $W_P$ represents the parent node world matrix.

---

## 3. Ray-Sphere Collision Detection

A raycast checks intersection against the node bounding sphere center $C$ and radius $r$:
$$(D \cdot (O - C))^2 - (\|O - C\|^2 - r^2) \ge 0$$
If discriminant is positive, the ray hits the sphere.
