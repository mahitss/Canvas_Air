import { FrameBudget } from "../types";
import { RendererConfig } from "../config";

export class FrameScheduler {
  private config: RendererConfig;
  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private rafId: number | null = null;

  // Frame timing callback
  private onRenderTick: (budget: FrameBudget) => void;

  constructor(config: RendererConfig, onRenderTick: (budget: FrameBudget) => void) {
    this.config = config;
    this.onRenderTick = onRenderTick;
  }

  public start(): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (timestamp: number): void => {
    if (!this.isRunning) {
      return;
    }

    const elapsed = timestamp - this.lastFrameTime;
    const targetIntervalMs = 1000.0 / this.config.targetFps;

    // Check VSync frame pacing constraints
    if (this.config.vsync && elapsed < targetIntervalMs - 1.0) {
      this.rafId = requestAnimationFrame(this.loop);
      return;
    }

    this.frameCount++;
    this.lastFrameTime = timestamp;

    const startExecution = performance.now();
    
    // Formulate budget payload
    const budget: FrameBudget = {
      elapsedMs: 0.0, // calculated post-render
      targetMs: targetIntervalMs,
      budgetExceeded: false,
      frameIndex: this.frameCount
    };

    // Execute actual pipeline render tick
    this.onRenderTick(budget);

    const endExecution = performance.now();
    const executionDuration = endExecution - startExecution;
    
    budget.elapsedMs = executionDuration;
    budget.budgetExceeded = executionDuration > targetIntervalMs;

    this.rafId = requestAnimationFrame(this.loop);
  };
}
