import { StructuredDocumentModel } from "../domain";

export interface StandardCanvasLayerObject {
  id: string;
  type: "text" | "rect" | "table";
  x: number;
  y: number;
  w: number;
  h: number;
  properties: {
    content: string;
    sourceMetadata: {
      docId: string;
      confidence: number;
    };
  };
}

export class PlatformIntegrationManager {
  /**
   * Transforms structured documents layout models into platform canvas layers elements
   * preserving confidence metadata labels.
   */
  public convertToCanvasLayers(model: StructuredDocumentModel): StandardCanvasLayerObject[] {
    const layers: StandardCanvasLayerObject[] = [];

    for (const page of model.pages) {
      for (const region of page.regions) {
        for (const block of region.blocks) {
          layers.push({
            id: `lay-${block.id}-${Date.now()}`,
            type: block.type === "text" ? "text" : "rect",
            x: block.boundingBox.x,
            y: block.boundingBox.y,
            w: block.boundingBox.w,
            h: block.boundingBox.h,
            properties: {
              content: block.content,
              sourceMetadata: {
                docId: model.id,
                confidence: block.confidence
              }
            }
          });
        }
      }
    }

    return layers;
  }
}
