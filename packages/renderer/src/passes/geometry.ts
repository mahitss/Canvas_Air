import { BaseRenderPass, RenderPassContext } from "./base";
import { SceneNode } from "../scene/node";
import { FrameBudget } from "../types";

export class GeometryPass extends BaseRenderPass {
  public drawCallsCount: number = 0;
  public renderedNodesCount: number = 0;
  public culledNodesCount: number = 0;

  constructor() {
    super("GeometryPass", 10, true);
  }

  public execute(context: RenderPassContext, _budget: FrameBudget): void {
    this.drawCallsCount = 0;
    this.renderedNodesCount = 0;
    this.culledNodesCount = 0;

    const { ctx, camera, scene } = context;

    // Apply Camera view matrix transforms to Canvas Context
    ctx.save();
    
    const vm = camera.getViewMatrix();
    ctx.transform(vm[0], vm[3], vm[1], vm[4], vm[2], vm[5]);

    // Depth-first scene graph traversal
    scene.traverse((node: SceneNode) => {
      // Skip the root node itself
      if (node.id === "root") {
        return;
      }

      const bounds = node.getWorldBounds();
      
      // Perform viewport frustum culling
      if (!camera.isVisible(bounds)) {
        this.culledNodesCount++;
        return;
      }

      this.renderedNodesCount++;
      this.drawCallsCount++;
      
      this.renderNode(ctx, node);
    });

    ctx.restore();
  }

  private renderNode(ctx: CanvasRenderingContext2D, node: SceneNode): void {
    ctx.save();
    
    // Apply local transforms relative to parent coordinate space using matrix
    const lm = node.getLocalTransform();
    ctx.transform(lm[0], lm[3], lm[1], lm[4], lm[2], lm[5]);
    
    ctx.globalAlpha *= node.opacity;

    // Mock draw stroke bounding box representing graphic elements rendering
    if (node.type === "StrokeNode") {
      ctx.strokeStyle = "#00E5FF";
      ctx.lineWidth = 3;
      ctx.strokeRect(-20, -20, 40, 40);
    } else if (node.type === "LayerNode") {
      // Mock layer boundaries representation draw
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(-100, -100, 200, 200);
    }

    ctx.restore();
  }
}
export * from "./base";
