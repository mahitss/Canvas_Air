# VisionCanvas AI: AI Orchestrator SDK Documentation

The **AI Orchestrator Engine** (`@visioncanvas/ai-orchestrator`) acts as the central control plane coordinating hand tracking, gesture recognition, voice recognition, shape detection, and future OCR pipelines. It schedules tasks via priority queues, routes requests based on capability requirements, validates outputs, and aggregates observabilities.

---

## 1. System Pipeline Architecture

```
                       +-----------------------------------+
                       |           AiOrchestrator          |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |           TaskScheduler           |
                       |    (Priority queues scheduler)    |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          EngineRouter             |
                       |    (Resolves capability mapping)  |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          ModuleRegistry           |
                       |   (Dynamic capability catalogs)   |
                       +-----------------------------------+
```

---

## 2. Priority Queue & Weight Factors

Each task is assigned a priority and scheduled descending by priority weight:
*   `high`: weight = 3
*   `medium`: weight = 2
*   `low`: weight = 1

Within matching priority slots, tasks are sorted FIFO (based on `createdAt` timestamps).

---

## 3. Fallback capability routes

If a primary module fails or times out, the `EngineRouter` recovers by executing secondary capabilities:
$$\text{Fallback Target} = \operatorname{fallbackRegistry.get}(\text{capability})$$
Task retries are scheduled up to `retryLimit` before marking states as `failed`.
