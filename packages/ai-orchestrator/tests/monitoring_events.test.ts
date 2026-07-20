import { describe, it, expect } from "vitest";
import { AiOrchestratorEventBus } from "../src/events/bus";
import { AiMonitoringService } from "../src/debug/monitoring";
import { ModuleRegistry } from "../src/registry/module_registry";
import { TaskScheduler } from "../src/scheduler/task_scheduler";
import { AiEvent, AiTask } from "../src/types";

describe("AI Event Bus", () => {
  it("should publish events with strong types, support wildcard subscribers, isolate exceptions, and support history replays", () => {
    const bus = new AiOrchestratorEventBus();

    // 1. Strong typed event definitions
    const event1: AiEvent = {
      type: "TaskQueued",
      payload: { taskId: "task-123", name: "shape", priority: "high" },
      timestamp: Date.now()
    };

    const event2: AiEvent = {
      type: "TaskStarted",
      payload: { taskId: "task-123", providerName: "ShapeProvider" },
      timestamp: Date.now()
    };

    // 2. Publish and subscribe
    const received: string[] = [];
    bus.subscribe("TaskQueued", (e) => {
      received.push(e.payload.taskId);
    });

    // Exception isolation subscriber
    bus.subscribe("TaskQueued", () => {
      throw new Error("Isolated subscriber crash!");
    });

    bus.publish(event1);
    bus.publish(event2);

    expect(received).toContain("task-123");

    // 3. Wildcard subscription
    const wildcardReceived: string[] = [];
    bus.subscribe("*", (e) => {
      wildcardReceived.push(e.type);
    });

    bus.publish({
      type: "TaskCompleted",
      payload: { taskId: "task-123", latencyMs: 45 },
      timestamp: Date.now()
    });

    expect(wildcardReceived).toContain("TaskCompleted");

    // 4. Replay support
    const replayed: string[] = [];
    bus.subscribe("TaskQueued", (e) => {
      replayed.push(e.payload.taskId);
    }, { replay: true });

    // Should receive past event1 instantly during subscription
    expect(replayed).toContain("task-123");
  });
});

describe("AI Monitoring Service", () => {
  it("should monitor task latencies, queue lengths, CPU/memory telemetry, and error/success rates", async () => {
    const registry = new ModuleRegistry();
    const scheduler = new TaskScheduler();
    const monitor = new AiMonitoringService(registry, scheduler);

    // Populate mock task statistics
    const task: AiTask = {
      id: "task-mon",
      name: "ocr",
      priority: "medium",
      payload: {},
      status: "pending",
      timeoutMs: 100,
      retryLimit: 1,
      retryCount: 0,
      createdAt: Date.now() - 50 // 50ms latency
    };

    scheduler.enqueue(task);
    
    // Simulate successful run
    await scheduler.executeTask(task, async () => {
      monitor.recordExecution(50);
      return "text";
    });

    const metrics = monitor.getMetrics();

    // Verify tracked rates and latency
    expect(metrics.queueLength).toBe(0); // completed
    expect(metrics.successRate).toBe(1);
    expect(metrics.errorRate).toBe(0);
    expect(metrics.totalExecutionTimeMs).toBe(50);
    expect(metrics.systemMemoryHeapUsed).toBeGreaterThanOrEqual(0);
  });
});
