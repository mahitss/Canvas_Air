import { describe, it, expect } from "vitest";
import { TaskScheduler } from "../src/scheduler/task_scheduler";
import { AiTask } from "../src/types";

describe("AI Task Scheduler", () => {
  it("should schedule, cancel, retry, timeout, limit concurrency, and log statistics", async () => {
    // Initialize scheduler with concurrency limit = 2
    const scheduler = new TaskScheduler(2);

    const task1: AiTask = {
      id: "task-1",
      name: "task1",
      priority: "low",
      payload: {},
      status: "pending",
      timeoutMs: 50,
      retryLimit: 1,
      retryCount: 0,
      createdAt: Date.now()
    };

    const task2: AiTask = {
      id: "task-2",
      name: "task2",
      priority: "high",
      payload: {},
      status: "pending",
      timeoutMs: 500,
      retryLimit: 1,
      retryCount: 0,
      createdAt: Date.now()
    };

    const task3: AiTask = {
      id: "task-3",
      name: "task3",
      priority: "medium",
      payload: {},
      status: "pending",
      timeoutMs: 500,
      retryLimit: 1,
      retryCount: 0,
      createdAt: Date.now()
    };

    // 1. Priority scheduling
    scheduler.enqueue(task1);
    scheduler.enqueue(task2);
    scheduler.enqueue(task3);

    // Concurrency is 0/2, so high priority "task-2" should be next
    let next = scheduler.getNextExecutableTask();
    expect(next?.id).toBe("task-2");

    // 2. Concurrency limit limits execution
    const runner = async () => new Promise(res => setTimeout(res, 10));

    // Execute first two tasks (reaches concurrency limit of 2)
    const p1 = scheduler.executeTask(task2, runner);
    const p2 = scheduler.executeTask(task3, runner);

    // Concurrency limit reached! Next executable should return undefined
    expect(scheduler.getNextExecutableTask()).toBeUndefined();

    await Promise.all([p1, p2]);

    // 3. Task cancellation
    scheduler.cancel("task-1");
    expect(scheduler.getTask("task-1")?.status).toBe("cancelled");

    // 4. Retries & Timeouts check
    const failingTask: AiTask = {
      id: "task-fail",
      name: "failingTask",
      priority: "high",
      payload: {},
      status: "pending",
      timeoutMs: 10, // low timeout to trigger failure
      retryLimit: 2,
      retryCount: 0,
      createdAt: Date.now()
    };

    scheduler.enqueue(failingTask);
    const slowRunner = async () => new Promise(res => setTimeout(res, 100));

    await expect(scheduler.executeTask(failingTask, slowRunner)).rejects.toThrow();

    // Verify retries occurred
    expect(failingTask.retryCount).toBe(2);
    expect(failingTask.status).toBe("failed");

    // 5. Statistics collection
    const stats = scheduler.getStats();
    expect(stats.completed).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.cancelled).toBe(1);
    expect(stats.totalProcessed).toBe(3);
  });
});
