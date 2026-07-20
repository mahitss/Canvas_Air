# VisionCanvas AI: Visual Effects (VFX) & Particle SDK Documentation

The **Visual Effects (VFX) & Particle Engine** (`@visioncanvas/vfx`) acts as the high-performance particle spawner for VisionCanvas AI. It runs dynamic visual overlays mapped to gesture motions, stroke lines, and user interface selections.

---

## 1. System Architecture

```
                       +-----------------------------------+
                       |           EmitterSystem           |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |         ParticleEmitter           |
                       |  (Point, Circle, Rect Spawners)   |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          ParticlePool             |
                       |    (Warmed-up object cache)       |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          PhysicsSolver            |
                       |    (Gravity, Wind, Drag, Noise)   |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |        Canvas rendering           |
                       |      (Screen / Lighter Blends)    |
                       +-----------------------------------+
```

---

## 2. Environmental Physics & Forces integration

For each update tick duration $dt$, forces are computed:

$$F_{\text{external}} = F_{\text{gravity}} + F_{\text{wind}} + F_{\text{drag}} + F_{\text{turbulence}}$$

Kinematics variables are updated sequentially:

$$V_{t+1} = V_t + F_{\text{external}} \cdot dt$$

$$P_{t+1} = P_t + V_{t+1} \cdot dt$$

*   **Gravity**: Constant acceleration vector.
*   **Drag**: $F_{\text{drag}} = -C_{\text{drag}} \cdot V$ opposing the movement direction.
*   **Turbulence**: Noise fields modeled using trigonometric projections.

---

## 3. Predefined Emitter Presets

The SDK includes standard built-in visual configurations:

1.  **Fire**: Emits large expanding circular red/yellow/orange particles that drift upwards (`gravity = -1.5`) and blend with `lighter` additive composition.
2.  **Electricity**: Spawns rapid, high-speed blue/cyan sparks that dissipate quickly (`lifetime = 0.1s - 0.4s`).
3.  **Neon**: Trailing purple/green/blue glowing particles that fade smoothly.
4.  **Magic**: Golden/magenta sparkles that drift downwards slowly under a gentle gravitational field.
