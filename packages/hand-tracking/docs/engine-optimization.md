# Hand Tracking Engine Optimizations Report

This document audits the optimization strategies, latency reductions, and memory throughput improvements implemented in `@visioncanvas/hand-tracking`.

---

## 1. Allocation Minimization & Pooling

To prevent garbage collection overhead during 60 FPS video streams, we implement **object pools** for active tracking payloads.
*   **Struct Recycling**: A pre-allocated pool of size 4 is recycled sequentially to yield `HandPresence` structures.
*   **Result**: Reduces transient memory allocations to zero for the core object lifecycle mapping path, resulting in flat memory heap lines during continuous use.

---

## 2. Adaptive Frame Rate Skipping

The engine dynamically monitors the moving average duration of the frame processing passes (`avgProcessingTimeMs`).
*   **Budget Ceiling**: A configurable `maxBudgetMs` parameters window is audited (default `16ms`).
*   **Throttling**: If average latency surpasses the budget threshold, the engine automatically switches to a 1-out-of-2 skip frequency. This prevents thread blockage and allows smooth UI performance.

---

## 3. Redundant Work Skipping

If the `HandDetector` returns no active hands (e.g. clean canvas or empty frame input), the tracker skips calculating distances between candidates and active tracks, returning immediately.
