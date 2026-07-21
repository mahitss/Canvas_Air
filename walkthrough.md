# VisionCanvas AR | Zero-Noise Visual Polish & Minimalist Overhaul

VisionCanvas AR has undergone a complete **Zero-Noise Visual Polish & Minimalist Overhaul** so the webcam feed and user creation take center stage like commercial Apple WWDC software.

---

## 🎨 Visual Noise Elimination Summary

### 1. Developer Mode Scoped Debug Visuals
*   **Disabled by Default**: MediaPipe landmark points, skeleton lines, hand IDs, tracking vectors, gesture helper lines, debug bounding boxes, coordinate systems, permanent measurements, and permanent labels are disabled by default (`devMode === false`).
*   **Developer Mode Toggle**: Skeleton drawings and pipeline telemetry overlays render strictly when Developer Telemetry is toggled ON (`devMode === true`).

### 2. CAD Construction Grid Subtlety
*   **Grid Opacity**: Construction grid in Engineering Studio renders at an ultra-subtle $5\%$ opacity (`rgba(255,255,255,0.05)`), every $5^{\text{th}}$ line at $12\%$.
*   **Placement Highlighting**: Brightens slightly ($14\%$) only during active component placement, smoothly fading back to $5\%$ idle opacity.

### 3. Apple Vision Pro Minimalist Interface
*   **Floating Navigation Header**: VisionCanvas AR logo badge, mode switcher pill cards, hand selector toggles, onboarding trigger, and developer toggle.
*   **Icon-Only Left Tool Dock**: Expandable on hover with soft `#4F8CFF` active glows (`Pen`, `Eraser`, `Line`, `Rectangle`, `Circle`, `Text`, `Undo`, `Redo`, `Clear`, `Export`).
*   **Contextual Right Panel**: Displayed ONLY when active (Air Draw brush settings, Hero Mode power controls, Spatial Voxel material selection, Engineering Studio parametric domain selection).
*   **Single Status HUD Pill**: Minimal bottom status pill displaying `60 FPS`, active tool, gesture state (`Air Pen ☝️ / Pinch 🤏`), and tracking quality status.

---

## 🚀 GitHub Repository Deployment Status
*   **Repository**: **[github.com/mahitss/Canvas_Air](https://github.com/mahitss/Canvas_Air.git)**
*   **Branch**: `main`
*   **Latest Commit**: `92ab29b` - *fix: Eliminate all production visual noise, scope skeleton rendering strictly to devMode, and reduce CAD grid opacity*
*   **Monorepo Build**: **30 / 30 packages compiled in 44.7s with 0 errors**.
