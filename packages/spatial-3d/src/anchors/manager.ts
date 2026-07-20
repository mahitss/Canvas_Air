import { SpatialAnchor, Vector3 } from "../types";

export class AnchorManager {
  private anchors: Map<string, SpatialAnchor> = new Map();

  /**
   * Registers a persistent real-world spatial anchor.
   */
  public createAnchor(name: string, position: Vector3, orientation: Vector3): SpatialAnchor {
    const id = `anchor-${Math.random().toString(36).substr(2, 9)}`;
    const anchor: SpatialAnchor = {
      id,
      name,
      position,
      orientation,
      createdAt: Date.now()
    };
    this.anchors.set(id, anchor);
    return anchor;
  }

  public getAnchors(): SpatialAnchor[] {
    return Array.from(this.anchors.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public removeAnchor(id: string): void {
    this.anchors.delete(id);
  }

  public clearAnchors(): void {
    this.anchors.clear();
  }
}
