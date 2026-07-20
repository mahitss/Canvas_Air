import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AiOrchestrator } from "../src/orchestrator";
import { AiModule, AiTask } from "../src/types";
import { TaskScheduler } from "../src/scheduler/task_scheduler";

describe("AI Orchestrator Central Plane", () => {
  let orchestrator: AiOrchestrator;

  beforeEach(() => {
    orchestrator = new AiOrchestrator({
      maxQueueSize: 100,
      workerTickIntervalMs: 2,
      enableTimeoutChecks: true,
      maxParallelTasks: 2
    });
  });

  afterEach(() => {
    orchestrator.shutdown();
  });

  it("should register modules and return health check status map", async () => {
    const dummyModule: AiModule = {
      name: "hand-tracking-mod",
      capabilities: ["hand_tracking"],
      execute: async (task: AiTask) => ({ handCount: 1 }),
      healthCheck: async () => true
    };

    orchestrator.registerModule(dummyModule);
    expect(orchestrator.getAvailableModules()).toContain("hand-tracking-mod");
  });

  it("should sort scheduler queue based on priority weight", () => {
    const scheduler = new TaskScheduler();
    
    const taskLow: AiTask = {
      id: "task-low",
      name: "test",
      priority: "low",
      payload: {},
      status: "pending",
      timeoutMs: 1000,
      retryLimit: 1,
      retryCount: 0,
      createdAt: 100
    };

    const taskHigh: AiTask = {
      id: "task-high",
      name: "test",
      priority: "high",
      payload: {},
      status: "pending",
      timeoutMs: 1000,
      retryLimit: 1,
      retryCount: 0,
      createdAt: 200
    };

    scheduler.enqueue(taskLow);
    scheduler.enqueue(taskHigh);

    const next = scheduler.getNextExecutableTask();
    expect(next?.id).toBe("task-high");
  });

  it("should failover to fallback capability when primary module fails", async () => {
    const primaryModule: AiModule = {
      name: "primary-ocr",
      capabilities: ["ocr"],
      execute: async (task: AiTask) => {
        throw new Error("Primary OCR pipeline crash.");
      },
      healthCheck: async () => true
    };

    const fallbackModule: AiModule = {
      name: "fallback-ocr-mod",
      capabilities: ["fallback_ocr"],
      execute: async (task: AiTask) => "fallback-text",
      healthCheck: async () => true
    };

    orchestrator.registerModule(primaryModule);
    orchestrator.registerModule(fallbackModule);
    
    // Register routing fallback relationship
    orchestrator.registerFallback("ocr", "fallback_ocr");

    // Submit request targeting capability 'ocr'
    const result = await orchestrator.submitTask("ocr", "ocr", "high", {});
    // Should fallback to fallback_ocr execution and resolve successfully
    expect(result).toBe("fallback-text");
  });
});
