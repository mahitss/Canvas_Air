import { describe, it, expect } from "vitest";
import { RetryManager } from "../src/scheduler/retry_manager";
import { PipelineEngine, Pipeline, PipelineStep } from "../src/pipeline/pipeline_engine";
import { AiTask } from "../src/types";

describe("AI Retry Manager", () => {
  it("should classify errors, calculate backoff, manage circuit breakers, and log to DLQ", () => {
    const rm = new RetryManager({
      maxRetries: 3,
      baseDelayMs: 10,
      backoffFactor: 2,
      maxDelayMs: 1000
    });

    // 1. Error classification
    expect(rm.classifyError(new Error("Network timeout occurred"))).toBe("TRANSIENT");
    expect(rm.classifyError(new Error("SyntaxError: Unexpected token"))).toBe("FATAL");

    // 2. Exponential backoff delay
    expect(rm.getBackoffDelay(0)).toBe(10);
    expect(rm.getBackoffDelay(2)).toBe(40); // 10 * 2^2 = 40

    // 3. Circuit Breaker transitions
    const cb = rm.getCircuitBreaker("test-provider");
    expect(cb.state).toBe("CLOSED");
    expect(cb.canExecute()).toBe(true);

    // Record failures up to threshold
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();

    expect(cb.state).toBe("OPEN");
    expect(cb.canExecute()).toBe(false); // fast fails!

    // Record success in HALF_OPEN resets breaker
    (cb as any).state = "HALF_OPEN";
    cb.recordSuccess();
    expect(cb.state).toBe("CLOSED");

    // 4. Dead-Letter Queue
    const mockTask: AiTask = {
      id: "t-fail",
      name: "task",
      priority: "high",
      payload: {},
      status: "pending",
      timeoutMs: 100,
      retryLimit: 1,
      retryCount: 0,
      createdAt: Date.now()
    };
    rm.sendToDlq(mockTask, "Max retries exceeded");
    expect(rm.getDlqTasks().length).toBe(1);
    expect(rm.getDlqTasks()[0]?.error).toBe("DLQ: Max retries exceeded");
  });
});

describe("AI Pipelines Engine", () => {
  it("should execute sequential, parallel, conditional steps, handle cancellations and resume successfully", async () => {
    const engine = new PipelineEngine();

    const pipeline: Pipeline = {
      id: "pipeline-1",
      steps: [
        { id: "step-1", name: "step1", capability: "ocr", payload: {}, dependencies: [], status: "pending" },
        { id: "step-2", name: "step2", capability: "translation", payload: {}, dependencies: ["step-1"], status: "pending" },
        // Conditional step that should be skipped
        {
          id: "step-3",
          name: "step3",
          capability: "summarize",
          payload: {},
          dependencies: ["step-1"],
          status: "pending",
          condition: (ctx) => ctx["step-1"] === "skipped-value" // evaluates to false
        },
        // Parallel step executing along step-2
        { id: "step-4", name: "step4", capability: "voice", payload: {}, dependencies: ["step-1"], status: "pending" }
      ],
      status: "pending",
      context: {}
    };

    const executedSteps: string[] = [];
    const runner = async (step: PipelineStep) => {
      executedSteps.push(step.id);
      if (step.id === "step-1") return "text-output";
      if (step.id === "step-2") return "translated-output";
      return "voice-output";
    };

    // Execute pipeline
    await engine.executePipeline(pipeline, runner);

    expect(pipeline.status).toBe("completed");
    expect(pipeline.context["step-1"]).toBe("text-output");
    expect(pipeline.context["step-2"]).toBe("translated-output");
    expect(pipeline.context["step-4"]).toBe("voice-output");

    // step-3 skipped because condition returned false
    const step3 = pipeline.steps.find(s => s.id === "step-3");
    expect(step3?.status).toBe("skipped");

    // Execution order verification: step-1 runs first, then step-2 and step-4 run
    expect(executedSteps[0]).toBe("step-1");
    expect(executedSteps.slice(1)).toContain("step-2");
    expect(executedSteps.slice(1)).toContain("step-4");

    // --- TEST 2: Pipeline cancellation and resumption ---
    const cancellablePipeline: Pipeline = {
      id: "p-cancellable",
      steps: [
        { id: "s-1", name: "s1", capability: "ocr", payload: {}, dependencies: [], status: "pending" },
        { id: "s-2", name: "s2", capability: "translation", payload: {}, dependencies: ["s-1"], status: "pending" }
      ],
      status: "pending",
      context: {}
    };

    const slowRunner = async (step: PipelineStep) => {
      if (step.id === "s-1") {
        engine.cancelPipeline(cancellablePipeline); // cancel during s-1 run!
      }
      return "done";
    };

    await engine.executePipeline(cancellablePipeline, slowRunner);
    expect(cancellablePipeline.status).toBe("cancelled");
    expect(cancellablePipeline.steps.find(s => s.id === "s-2")?.status).toBe("cancelled");

    // Resume execution
    const resumeRunner = async (step: PipelineStep) => {
      return `resumed-${step.id}`;
    };

    await engine.resumePipeline(cancellablePipeline, resumeRunner);
    expect(cancellablePipeline.status).toBe("completed");
    
    // s-1 is kept completed with 'done' cached result, while s-2 executes and gets 'resumed-s-2'
    expect(cancellablePipeline.context["s-1"]).toBe("done");
    expect(cancellablePipeline.context["s-2"]).toBe("resumed-s-2");
  });
});
