import { Ray3D, SceneNode3D, Vector3 } from "../types";
import { SpatialInteractionEngine as BaseEngine } from "./engine";

export interface HoverState {
  hoveredNodeId: string | null;
  hoverDurationMs: number;
}

export class ExtendedInteractionEngine extends BaseEngine {
  private focusNodeId: string | null = null;
  private readonly hoverState: HoverState = { hoveredNodeId: null, hoverDurationMs: 0 };

  public selectNode(ray: Ray3D, nodes: SceneNode3D[]): SceneNode3D | null {
    const hits = this.raycast(ray, nodes);
    return hits[0] || null;
  }

  public updateHover(ray: Ray3D, nodes: SceneNode3D[]): HoverState {
    const active = this.selectNode(ray, nodes);
    if (active) {
      if (this.hoverState.hoveredNodeId === active.id) {
        this.hoverState.hoverDurationMs += 16;
      } else {
        this.hoverState.hoveredNodeId = active.id;
        this.hoverState.hoverDurationMs = 0;
      }
    } else {
      this.hoverState.hoveredNodeId = null;
      this.hoverState.hoverDurationMs = 0;
    }
    return { ...this.hoverState };
  }

  public setFocusedNode(nodeId: string | null): void {
    this.focusNodeId = nodeId;
  }

  public getFocusedNodeId(): string | null {
    return this.focusNodeId;
  }

  public processDirectManipulation(pos: Vector3, node: SceneNode3D): void {
    // Translate directly to target world coordinate translations
    node.worldMatrix[12] = pos.x;
    node.worldMatrix[13] = pos.y;
    node.worldMatrix[14] = pos.z;
  }
}
