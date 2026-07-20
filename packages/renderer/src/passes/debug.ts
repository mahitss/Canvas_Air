import { BaseRenderPass, RenderPassContext } from "./base";
import { FrameBudget } from "../types";

export class DebugPass extends BaseRenderPass {
  public fps: number = 60;
  public drawCalls: number = 0;
  public culledCount: number = 0;

  constructor() {
    super("DebugPass", 30, true);
  }

  public execute(context: RenderPassContext, budget: FrameBudget): void {
    const { ctx } = context;

    ctx.save();
    ctx.font = "12px monospace";
    ctx.fillStyle = "#FF00FF"; // Vibrant diagnostic magenta

    // Draw FPS and render budget metrics overlay
    ctx.fillText(`FPS: ${this.fps.toFixed(1)}`, 15, 25);
    ctx.fillText(`Draw Calls: ${this.drawCalls}`, 15, 45);
    ctx.fillText(`Culled Nodes: ${this.culledCount}`, 15, 65);
    ctx.fillText(`Frame Time: ${budget.elapsedMs.toFixed(2)}ms / ${budget.targetMs.toFixed(2)}ms`, 15, 85);
    
    if (budget.budgetExceeded) {
      ctx.fillStyle = "#FF3333";
      ctx.fillText("BUDGET EXCEEDED!", 15, 105);
    }

    ctx.restore();
  }
}
