# VisionCanvas AR | Parametric Spatial CAD Engine Report

Engineering Studio has been redesigned from scratch into a **Professional Parametric Spatial CAD Experience**, completely eliminating voxel building.

---

## 🏗️ Parametric Spatial CAD Architecture

### 1. Parametric Component Catalog
*   **Architecture**:
    *   `Wall`: Linear stretching component (`x1, y1` to `x2, y2`)
    *   `Door`: Automatically embeds into wall spans with opening bounds
    *   `Window`: Glass parametric component embedded inside walls
    *   `Column`, `Beam`, `Roof`, `Floor`
*   **Mechanical**: `Pipe`, `Gear`, `Motor`, `Bearing`
*   **Electrical & Robotics**: `Battery`, `LED`, `Switch`, `Sensor`, `Robot Arm`

### 2. Interaction & Visual CAD Principles
*   **Rubberband Linear Stretching**: Walls, beams, and pipes stretch between 2 points with live millimeter readout.
*   **Intelligent Wall Embedding**: Doors and windows automatically detect and embed into wall spans.
*   **Intelligent CAD Snapping**: Grid snapping (`20px`) with edge snapping.
*   **Ghost Placement Preview**: Shows dashed CAD outline and translucent preview before placement.
*   **Clean CAD View**: Construction grid is visible **ONLY** while placing or editing. Landmark lines, skeletons, particles, and debug overlays are hidden during CAD mode for a clean spatial view.

---

## 🚀 GitHub Repository Deployment
*   **Repository**: **[github.com/mahitss/Canvas_Air](https://github.com/mahitss/Canvas_Air.git)**
*   **Branch**: `main`
*   **Commit Message**: `feat: Redesign Engineering Studio as a Parametric Spatial CAD Engine`
