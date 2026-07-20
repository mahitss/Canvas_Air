import { describe, it, expect } from "vitest";
import { wrapShapeRecognition, wrapHandwriting, wrapVoiceCommand } from "../src/integration/providers";
import { ModuleRegistry } from "../src/registry/module_registry";
import { TaskScheduler } from "../src/scheduler/task_scheduler";
import { AiTask } from "../src/types";

describe("AI Integration Adapters", () => {
  it("should wrap engine interfaces to AiModule contracts without violating boundaries", async () => {
    // 1. Mock engines matching ducks types
    const mockShapeEngine = {
      recognize: (pts: any[]) => ({ shape: "circle", confidence: 0.95 }),
      isHealthy: () => true
    };

    const mockHandwritingEngine = {
      recognizeHandwriting: (strokes: any[]) => ({ text: "hello" }),
      isHealthy: () => true
    };

    const mockVoiceEngine = {
      processAudio: (buf: any) => ({ intent: "draw_rectangle" }),
      isHealthy: () => true
    };

    const shapeModule = wrapShapeRecognition(mockShapeEngine);
    const hwModule = wrapHandwriting(mockHandwritingEngine);
    const voiceModule = wrapVoiceCommand(mockVoiceEngine);

    const task: AiTask = {
      id: "t-1",
      name: "run",
      priority: "high",
      payload: { points: [], strokes: [], audioBuffer: {} },
      status: "pending",
      timeoutMs: 100,
      retryLimit: 1,
      retryCount: 0,
      createdAt: Date.now()
    };

    const shapeRes = await shapeModule.execute(task);
    expect(shapeRes.shape).toBe("circle");

    const hwRes = await hwModule.execute(task);
    expect(hwRes.text).toBe("hello");

    const voiceRes = await voiceModule.execute(task);
    expect(voiceRes.intent).toBe("draw_rectangle");
  });
});

describe("AI Scheduler Benchmarks", () => {
  it("should handle heavy concurrent workload under low latency scheduling and reuse cached lookups", async () => {
    const registry = new ModuleRegistry();
    const scheduler = new TaskScheduler(1000); // 1,000 parallel workers limit

    const mockModule = {
      name: "MockShape",
      capabilities: ["shape_recognition"],
      execute: async () => "ok",
      healthCheck: async () => true,
      priority: 10
    };

    registry.register(mockModule);

    // 1. Cache hit verification
    const list1 = registry.getModulesByCapability("shape_recognition");
    const list2 = registry.getModulesByCapability("shape_recognition");
    expect(list1).toBe(list2); // references equality proves cache reuse!

    // 2. High concurrent workload simulation: 1,000 tasks
    const taskCount = 1000;
    const tasks: AiTask[] = [];
    
    const tStart = Date.now();
    for (let i = 0; i < taskCount; i++) {
      tasks.push({
        id: `bench-t-${i}`,
        name: "shape_recognition",
        priority: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
        payload: {},
        status: "pending",
        timeoutMs: 500,
        retryLimit: 1,
        retryCount: 0,
        createdAt: Date.now()
      });
    }

    // Enqueue all
    for (const t of tasks) {
      scheduler.enqueue(t);
    }

    const tEnqueue = Date.now() - tStart;
    console.log(`[Benchmark] Enqueued ${taskCount} tasks in ${tEnqueue}ms. Average: ${tEnqueue / taskCount}ms/task`);

    // Ensure they execute efficiently in parallel
    const runner = async () => "ok";
    const promises: Promise<any>[] = [];

    while (true) {
      const next = scheduler.getNextExecutableTask();
      if (!next) break;
      promises.push(scheduler.executeTask(next, runner));
    }

    await Promise.all(promises);
    const duration = Date.now() - tStart;
    console.log(`[Benchmark] Completed ${taskCount} concurrent tasks in ${duration}ms.`);

    const stats = scheduler.getStats();
    expect(stats.completed).toBe(taskCount);
  });
});
