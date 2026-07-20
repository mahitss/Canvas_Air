export interface PipelineStep {
  id: string;
  name: string;
  capability: string;
  payload: any;
  dependencies: string[]; // step IDs that must run first
  status: "pending" | "running" | "completed" | "failed" | "cancelled" | "skipped";
  result?: any;
  condition?: (context: any) => boolean;
}

export interface Pipeline {
  id: string;
  steps: PipelineStep[];
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  context: Record<string, any>;
}

export class PipelineEngine {
  /**
   * Executes a pipeline driving step dependencies, parallel runs, and conditions evaluation.
   */
  public async executePipeline(
    pipeline: Pipeline,
    runner: (step: PipelineStep) => Promise<any>
  ): Promise<void> {
    pipeline.status = "running";

    while (pipeline.status === "running") {
      // Find all steps that are ready to execute: pending status and all dependencies completed
      const eligibleSteps = pipeline.steps.filter((step) => {
        if (step.status !== "pending") return false;

        for (const depId of step.dependencies) {
          const depStep = pipeline.steps.find((s) => s.id === depId);
          if (!depStep || depStep.status !== "completed") {
            return false;
          }
        }
        return true;
      });

      // If no steps are eligible and no steps are running, we are either done or deadlocked
      const runningSteps = pipeline.steps.filter((s) => s.status === "running");
      if (eligibleSteps.length === 0 && runningSteps.length === 0) {
        const hasFailed = pipeline.steps.some((s) => s.status === "failed");
        if (hasFailed) {
          pipeline.status = "failed";
        } else if (pipeline.steps.some((s) => s.status === "pending")) {
          // Deadlock or cancelled
          pipeline.status = "failed";
        } else {
          pipeline.status = "completed";
        }
        break;
      }

      if (eligibleSteps.length === 0) {
        // Wait for some running steps to finish (yield to event loop)
        await new Promise((resolve) => setTimeout(resolve, 5));
        continue;
      }

      // Execute eligible steps in parallel
      const executions = eligibleSteps.map(async (step) => {
        // Evaluate condition if present
        if (step.condition && !step.condition(pipeline.context)) {
          step.status = "skipped";
          return;
        }

        step.status = "running";
        try {
          const result = await runner(step);
          step.status = "completed";
          step.result = result;
          // Store result in context grouped by step ID
          pipeline.context[step.id] = result;
        } catch (err) {
          step.status = "failed";
          pipeline.status = "failed";
          // Abort all other pending/running steps
          this.abortRemainingSteps(pipeline);
        }
      });

      await Promise.all(executions);
    }
  }

  /**
   * Cancels a running pipeline, marking it and all unfinished steps as cancelled.
   */
  public cancelPipeline(pipeline: Pipeline): void {
    if (pipeline.status === "running" || pipeline.status === "pending") {
      pipeline.status = "cancelled";
      for (const step of pipeline.steps) {
        if (step.status === "pending" || step.status === "running") {
          step.status = "cancelled";
        }
      }
    }
  }

  /**
   * Resumes execution of a failed/cancelled pipeline from where it stopped.
   */
  public async resumePipeline(
    pipeline: Pipeline,
    runner: (step: PipelineStep) => Promise<any>
  ): Promise<void> {
    if (pipeline.status !== "failed" && pipeline.status !== "cancelled") {
      return;
    }

    // Reset failed or cancelled steps back to pending, keeping completed ones untouched
    for (const step of pipeline.steps) {
      if (step.status === "failed" || step.status === "cancelled") {
        step.status = "pending";
      }
    }

    pipeline.status = "pending";
    return this.executePipeline(pipeline, runner);
  }

  private abortRemainingSteps(pipeline: Pipeline): void {
    for (const step of pipeline.steps) {
      if (step.status === "pending") {
        step.status = "cancelled";
      }
    }
  }
}
