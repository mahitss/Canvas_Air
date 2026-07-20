import { SceneNode } from "./node";

/**
 * SceneGraph coordinates tree graph traversals and coordinate spatial query lookups.
 */
export class SceneGraph {
  private root: SceneNode;

  constructor() {
    this.root = new SceneNode("root", "RootNode");
    // Ensure root is clean initially
    this.root.setDirty();
  }

  public getRoot(): SceneNode {
    return this.root;
  }

  public findNode(id: string): SceneNode | null {
    return this.findNodeRecursive(this.root, id);
  }

  private findNodeRecursive(current: SceneNode, id: string): SceneNode | null {
    if (current.id === id) {
      return current;
    }

    for (const child of current.children) {
      const match = this.findNodeRecursive(child, id);
      if (match) {
        return match;
      }
    }

    return null;
  }

  /**
   * Performs hit-testing against the entire scene graph.
   * Resolves the top-most visual node intersecting with target world coordinates.
   */
  public hitTest(worldX: number, worldY: number): SceneNode | null {
    // We hit test starting from the root node (root itself represents container boundary)
    const hit = this.root.hitTest(worldX, worldY);
    // Don't return root container node itself as selection candidate
    return hit && hit !== this.root ? hit : null;
  }

  /**
   * Performs pre-order depth-first traversal of nodes in the scene graph.
   */
  public traverse(callback: (node: SceneNode) => void): void {
    this.traverseRecursive(this.root, callback);
  }

  private traverseRecursive(node: SceneNode, callback: (node: SceneNode) => void): void {
    if (!node.isVisible) {
      return; // Skip rendering/updating invisible nodes and their sub-trees
    }
    
    callback(node);
    
    for (const child of node.children) {
      this.traverseRecursive(child, callback);
    }
  }

  public clear(): void {
    this.root.children = [];
    this.root.setDirty();
  }
}
export * from "./node";
