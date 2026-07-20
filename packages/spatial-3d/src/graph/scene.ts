import { SceneNode3D } from "../types";
import { MatrixMath } from "../math/matrix";

export class SceneGraph3D {
  private nodes: Map<string, SceneNode3D> = new Map();

  public getNodes(): SceneNode3D[] {
    return Array.from(this.nodes.values());
  }

  public addNode(node: SceneNode3D): void {
    this.nodes.set(node.id, { ...node });
    this.updateWorldMatrices();
  }

  public removeNode(id: string): void {
    this.nodes.delete(id);
    // Also remove children of deleted parents
    for (const [nodeId, node] of this.nodes.entries()) {
      if (node.parentId === id) {
        this.removeNode(nodeId);
      }
    }
    this.updateWorldMatrices();
  }

  /**
   * Evaluates child-parent hierarchy matrices recursively.
   */
  public updateWorldMatrices(): void {
    const activeNodes = Array.from(this.nodes.values());

    const updateNodeWorldMatrix = (node: SceneNode3D): void => {
      if (!node.parentId) {
        // Root node: world matrix matches local matrix
        node.worldMatrix.set(node.localMatrix);
      } else {
        const parent = this.nodes.get(node.parentId);
        if (parent) {
          // Recursive update parent world matrix first
          updateNodeWorldMatrix(parent);
          
          const combined = MatrixMath.multiply(parent.worldMatrix, node.localMatrix);
          node.worldMatrix.set(combined);
        } else {
          // Fallback if parent not found
          node.worldMatrix.set(node.localMatrix);
        }
      }
    };

    for (const node of activeNodes) {
      updateNodeWorldMatrix(node);
    }
  }

  public clearScene(): void {
    this.nodes.clear();
  }
}
