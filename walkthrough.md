# VisionCanvas AR | 2-State Movie-Quality Hero Mode Report

Hero Mode has been streamlined into a **Movie-Quality 2-State VFX Sequence** consisting exclusively of **SUMMON** and **UNLEASH**.

---

## 🎬 2-State Movie-Quality VFX Pipeline

### 1. State 1: SUMMON
*   **Sequential Fingertip Ignition**:
    *   Over the first 500ms when both hands appear, fingertips ignite sequentially:
        *   $0-100\text{ms}$: 🔴 **Thumb** (`#ef4444`)
        *   $100-200\text{ms}$: 🔵 **Index** (`#3b82f6`)
        *   $200-300\text{ms}$: 🟣 **Middle** (`#a855f7`)
        *   $300-400\text{ms}$: 🟡 **Ring** (`#eab308`)
        *   $400-500\text{ms}$: 🟢 **Pinky** (`#22c55e`)
*   **Stable Fingertip Energy Bridges (`FingertipBridgeRenderer`)**:
    *   Connects matching ignited fingertips directly across hands with glowing electric plasma cables.
*   **Energy Flow to Central Core**:
    *   Energy particles visibly travel along each cable into the central core at $\mathbf{P}_{mid} = \frac{\mathbf{P}_{left} + \mathbf{P}_{right}}{2}$.
*   **Central Core Power Formation**:
    *   Builds cinematic tension over 1–2 seconds ($0\% \rightarrow 100\%$).
    *   As power grows, ambient radial light auras expand alongside elemental core VFX (Galaxy cosmic nebula, Lightning plasma arcs, Fire embers, Ice geometry, Water ribbons, Solar corona rays, etc.).

---

### 2. State 2: UNLEASH
*   **Trigger**: Both hands push rapidly forward toward the camera ($\Delta z / \Delta t < -0.35$).
*   **Cinematic Attack Sequence**:
    1. Energy cables snap and collapse into the center core.
    2. $100\text{ms}$ high-density anticipation pause.
    3. Bright white flash bloom.
    4. High-speed elemental projectile launches forward with a long energy trail and star dust.
    5. Radial camera shockwave ring expands across the screen.
    6. Clean fade after the attack finishes.

---

## 📊 Performance & Memory Specifications
*   **FPS Target**: **60 FPS**
*   **Object Pooling**: Pre-allocated pool of **1,500 high-quality readable particles** (0 allocations inside the render loop).
*   **Non-Blocking Tracking**: Hero Mode runs asynchronously on 60 FPS requestAnimationFrame without delaying hand landmark tracking.

---

## 🚀 GitHub Repository Status
*   **Repository**: **[github.com/mahitss/Canvas_Air](https://github.com/mahitss/Canvas_Air.git)**
*   **Branch**: `main`
*   **Commit Message**: `feat: Redesign Hero Mode into 2-State Movie-Quality VFX Sequence (SUMMON & UNLEASH)`
