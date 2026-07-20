import { IAnchorManager } from "../interfaces";
import { SpatialAnchor } from "../types";
import { AnchorMetadata } from "../domain";
import { AnchorException } from "../errors";

export class SpatialAnchorManager implements IAnchorManager {
  private readonly anchors = new Map<string, { anchor: SpatialAnchor; metadata: AnchorMetadata }>();

  /**
   * Registers a spatial tracking anchor on the coordinate map.
   */
  public async createAnchor(anchor: SpatialAnchor, metadata: AnchorMetadata): Promise<void> {
    if (!anchor || !anchor.id || !metadata) {
      throw new AnchorException("Anchor and metadata parameters must be defined");
    }
    this.anchors.set(anchor.id, { anchor, metadata });
  }

  public async relocateAnchor(anchorId: string, newPosition: { x: number; y: number; z: number }): Promise<void> {
    const entry = this.anchors.get(anchorId);
    if (!entry) {
      throw new AnchorException(`Anchor ID not found: ${anchorId}`);
    }
    entry.anchor.position = { ...newPosition };
  }

  public async deleteAnchor(anchorId: string): Promise<void> {
    this.anchors.delete(anchorId);
  }

  public getAnchorMetadata(anchorId: string): AnchorMetadata | null {
    return this.anchors.get(anchorId)?.metadata || null;
  }

  public getAnchor(anchorId: string): SpatialAnchor | null {
    return this.anchors.get(anchorId)?.anchor || null;
  }
}
