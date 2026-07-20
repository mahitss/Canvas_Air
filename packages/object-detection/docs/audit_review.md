# Object Detection Security & Performance Audit

This document describes the safety audits, resource limitations, and denial-of-service mitigations implemented inside the `@visioncanvas/object-detection` package.

---

## 1. Denial-of-Service & Resource Exhaustion Mitigations

### A. Frame Rate Limiting (Frame Skipping)
* **Threat**: Flooding detection backends with raw stream frames (e.g. 120 FPS), causing memory exhaustion.
* **Fix**: Implemented a frame-skipping algorithm. Frames spaced closer than 33ms are discarded.

### B. Input Validation
* **Threat**: Processing corrupted image headers or empty buffers.
* **Fix**: Enforces size checks. Streams with zero-length pixels are rejected at the parsing step.

### C. Active Provider Verification
* **Threat**: Invoking providers without active registrations.
* **Fix**: Asserts provider state before dispatching operations.
