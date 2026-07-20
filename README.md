# VisionCanvas AI: Enterprise Spatial Computing Platform

VisionCanvas AI is a high-frequency, low-latency spatial computing application designed for gesture-based drawing, AI OCR writing, shape recognition, and real-time collaboration.

## High-Level Platform Architecture

```
                                  +------------------------------+
                                  |    Next.js Client (WebGL)    |
                                  +--------------+---------------+
                                                 |
                   +-----------------------------+-----------------------------+
                   | (Webcam Capture frames)                                   | (Drawing Sync deltas)
                   v                                                           v
  +--------------------------------+                          +--------------------------------+
  |    FastAPI AI Inference        |                          |     Express Collaboration      |
  |  (MediaPipe + ONNX Runtime)    |                          |       (Socket.io Gateway)      |
  +--------------------------------+                          +---------------+----------------+
                                                                              |
                                                       +----------------------+----------------------+
                                                       |                                             |
                                                       v                                             v
                                             +------------------+                          +------------------+
                                             | PostgreSQL (DB)  |                          |   Redis Cache    |
                                             +------------------+                          +------------------+
```

For a comprehensive explanation of our design systems, dynamic visual engine patterns, and network performance optimizations, refer to the [Architectural Specification](file:///C:/Users/pc/.gemini/antigravity-ide/brain/6b472288-37c2-43cc-b0d4-8517c06f5438/implementation_plan.md).

---

## Workspace Layout

Our monorepo layout isolates presentation logic from networking schemas and heavy AI python frameworks:

*   **`apps/web/`**: Next.js App router containing client capture scripts, Zustand canvas states, and custom fragment shaders.
*   **`apps/server/`**: Express sync gateway coordinating Socket.io room connections and database operations via Prisma.
*   **`apps/ai/`**: FastAPI computer vision service classifying gesture frames via MediaPipe and ONNX Runtime.
*   **`packages/core/`**: Shared types, constants, schemas, and validators.
*   **`packages/protocol/`**: Binary network data serialization configurations.
*   **`packages/tsconfig/`**: Shared tsconfig bases.
*   **`infrastructure/`**: IaC (Terraform) and containers (Docker Compose & Kubernetes).
*   **`scripts/`**: Developer automation tooling.
*   **`tests/`**: Core Playwright, Jest, and socket simulation E2E tests.

---

## Quickstart Guide

### One-Click Bootstrap
Run the setup script from the workspace root to pull modules, build shared packages, and initialize virtual environments:
```bash
./scripts/setup.sh
```

### Run Locally (Development Mode)
Once setup is complete, you can start the components independently:
*   **Frontend Web App**: `npm run dev:web` (Runs on port `3000`)
*   **Express Sync Server**: `npm run dev:server` (Runs on port `4000`)
*   **FastAPI AI Server**: `npm run dev:ai` (Runs on port `8000`)

To spin up the entire production environment with databases and cache:
```bash
cd infrastructure/docker
docker-compose --env-file dev.env up --build
```
