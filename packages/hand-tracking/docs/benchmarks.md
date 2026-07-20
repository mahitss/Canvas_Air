# Hand Landmark Smoother Performance Benchmarks

This report audits the execution times and latency budgets of the One-Euro filter algorithm implemented in `@visioncanvas/hand-tracking`.

---

## 1. Benchmark Methodology

*   **Test Size**: 10,000 frames.
*   **Emulated Pipeline Rate**: 30 FPS simulations (`dt = 33ms`).
*   **Coordinate Dimensions**: Smoothed 21 landmarks × 3 dimensions (X, Y, Z) = 63 operations per frame.

---

## 2. Target vs. Actual Metrics

| Metric | Target budget | Actual result |
| :--- | :--- | :--- |
| **Average Latency / Frame** | `< 50.0 microseconds` | **`~7.7 microseconds`** (0.0077ms) |
| **Throughput Capacity** | `> 20,000 FPS` | **`> 129,000 FPS`** |

---

## 3. Findings

1.  **Zero Memory Allocation**: The One-Euro filter maintains a single pre-allocated state register map matching the `handId`, completely avoiding transient heap allocation during streaming.
2.  **Highly Responsive**: The adaptive cutoff algorithm opens up during fast movements to eliminate lags and overshooting.
