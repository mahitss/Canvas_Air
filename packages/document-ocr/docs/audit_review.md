# Document Intelligence Security & Resource Audit

This document reports on safety gates, metadata integrity guards, and resource limits implemented inside the `@visioncanvas/document-ocr` package.

---

## 1. Safety Gates & Exhaustion Protections

### A. Resource Exhaustion Controls
* **Limits**: Enforces limits on page parsing counts (max 200 pages) and block counts (max 10,000 blocks per document).
* **Guards**: Inputs exceeding these sizes are truncated or rejected with `DocumentParserException`.

### B. Unsafe Embedded Content & Injections
* **Checks**: Scrubs text outputs and labels from HTML tags, shell injection triggers, and scripts components.

### C. Malformed Inputs Fallbacks
* **Decoders**: Enforces strict JSON schemas checks on native canvases payloads. Unrecognized tags are ignored rather than crashing the thread.
