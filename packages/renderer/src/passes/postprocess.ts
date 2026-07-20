import { BaseRenderPass, RenderPassContext } from "./base";
import { FrameBudget } from "../types";

export class PostProcessPass extends BaseRenderPass {
  constructor() {
    super("PostProcessPass", 20, true);
  }

  public execute(context: RenderPassContext, budget: FrameBudget): void {
    if (budget.budgetExceeded) {
      console.warn(`[FrameScheduler] Skipping post-process pass to maintain frame rate target.`);
      return; // Skip expensive image composite operations if budget exceeded
    }

    const { ctx, canvas } = context;

    // Simulate Vignette filter: darken canvas corners
    ctx.save();
    const w = canvas.width;
    const h = canvas.height;
    const gradient = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.4,
      w / 2, h / 2, Math.max(w, h) * 0.8
    );
    
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.35)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
