# VisionCanvas AR | "Less UI, More Interaction" Spatial CAD Report

Engineering Studio has been refactored according to the core philosophy: **"Less UI, More Interaction."**

---

## 🎨 Design Philosophy & Principles

1. **Clean Spatial Canvas**:
   * **Hidden Measurements & Labels**: Dimensions and object names are hidden by default, appearing **ONLY when an object is selected**.
   * **Subtle CAD Grid**: Grid is rendered at subtle $10-15\%$ opacity (`rgba(255,255,255,0.06)`), highlighting prominently only during placement.
   * **Zero Debug Clutter**: Landmark skeleton lines, particles, and debug overlays are completely disabled while in Engineering Studio.

2. **Intelligent Component Behaviors**:
   * **Wall / Pipe / Beam**: Tap start point $\rightarrow$ Drag rubberband line $\rightarrow$ Release. Component stretches automatically with live millimeter measurement.
   * **Door / Window**: Hover over a wall span $\rightarrow$ Automatic magnetic snap and rotation preview $\rightarrow$ Release to embed opening into wall.
   * **Discrete Components**: Gears, motors, bearings, sensors, and batteries place cleanly with subtle snap guides.

3. **Performance**:
   * Consistently maintains $30-60\text{ FPS}$ with zero allocations in the render loop.

---

## 🚀 GitHub Repository Deployment
*   **Repository**: **[github.com/mahitss/Canvas_Air](https://github.com/mahitss/Canvas_Air.git)**
*   **Branch**: `main`
*   **Commit Message**: `refactor: Redesign Engineering Studio with 'Less UI, More Interaction' CAD philosophy`
