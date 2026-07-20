import { SceneGraph } from "../scene/graph";
import { Camera2D } from "../camera/camera";
import { FrameBudget } from "../types";

export interface RenderPassContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: Camera2D;
  scene: SceneGraph;
}

export abstract class BaseRenderPass {
  public name: string;
  public isEnabled: boolean;
  public priority: number;

  constructor(name: string, priority: number = 0, isEnabled: boolean = true) {
    this.name = name;
    this.priority = priority;
    this.isEnabled = isEnabled;
  }

  /**
   * Main render execution step for the individual pass.
   */
  public abstract execute(
    context: RenderPassContext,
    budget: FrameBudget
  ): void;
}
