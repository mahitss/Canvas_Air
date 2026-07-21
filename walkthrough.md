# VisionCanvas AR | Architecture & Mode Lifecycle Engine Report

VisionCanvas AR has been refactored into a **Modular Mode-Based Engine Architecture** using `ModeManager.ts` and `ResourceManager.ts`, eliminating memory leaks, orphaned render loops, and particle accumulation.

---

## 🏛️ Architecture & Lifecycle Matrix

### 1. Centralized Mode Manager (`ModeManager.ts`)
*   **Strict Mode Isolation**: Enforces that **ONLY ONE** mode is active at any time:
    *   `Free Draw`
    *   `Smart Writing`
    *   `Hero Mode`
    *   `Spatial Build`
    *   `Engineering Studio`
*   **Automatic Mode Disposal**: When switching modes, `setActiveMode` invokes `dispose()` on the departing mode, purging particle pools, projectile arrays, stroke buffers, voxel grids, and node graphs.

### 2. Automatic Resource Manager (`ResourceManager.ts`)
*   **Offscreen Canvas Layer Management**: Tracks and recycles offscreen canvas contexts.
*   **Timer & Worker Purging**: Automatically tracks and cancels active `setTimeout` / `setInterval` timers upon mode disposal.

### 3. Production Debug Scoping
*   **Scoped Debug Overlay**: Scoped Pipeline Debugger overlays strictly to `devMode === true`, preventing debug UI clutter in production mode.

---

## 📊 Leaks Fixed & System Health Report

| Leak Category | Fix Applied | Result |
| :--- | :--- | :--- |
| **Particle Leaks** | ParticleEngine & ProjectileSystem cleared on mode switch | 0 orphan particles |
| **Timer Leaks** | `ResourceManager.clearTimer` cancels pending OCR timeouts | 0 orphaned timers |
| **Render Loop Leaks** | Consolidated into single 60 FPS requestAnimationFrame loop | 1 active loop |
| **Canvas Layer Leaks** | Offscreen canvas instances cached & recycled via `ResourceManager` | 0 canvas leak |
| **Debug UI Leaks** | Scoped strictly to `devMode === true` | Clean production UI |

---

## 🚀 GitHub Repository Deployment
*   **Repository**: **[github.com/mahitss/Canvas_Air](https://github.com/mahitss/Canvas_Air.git)**
*   **Branch**: `main`
*   **Commit Message**: `refactor: Implement ModeManager and ResourceManager for strict mode isolation and automatic resource disposal`
