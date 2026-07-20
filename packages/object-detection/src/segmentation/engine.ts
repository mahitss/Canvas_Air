import { DetectedObject, SegmentationMask } from "../types";

export interface SemanticSegment {
  label: string;
  confidence: number;
  pixelsUrl: string;
}

export class SegmentationEngine {
  /**
   * Generates localized instance bounding masks around coordinate points.
   */
  public generateMasks(objects: DetectedObject[]): SegmentationMask[] {
    const masks: SegmentationMask[] = [];

    for (const obj of objects) {
      const x = obj.x;
      const y = obj.y;
      const w = obj.w;
      const h = obj.h;

      // Extract a 4-point bounding contour
      const contourPoints = [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h }
      ];

      masks.push({
        objectId: obj.id,
        contourPoints
      });
    }

    return masks;
  }

  public generateSemanticSegmentation(imageUri: string): SemanticSegment[] {
    void imageUri;
    return [
      { label: "foreground-person", confidence: 0.95, pixelsUrl: "https://assets.ai/masks/sem_fg.png" },
      { label: "background-office", confidence: 0.89, pixelsUrl: "https://assets.ai/masks/sem_bg.png" }
    ];
  }

  public applyBackgroundMask(imageUri: string): string {
    return `${imageUri}?background-masked=true`;
  }

  public extractRegion(imageUri: string, box: { x: number; y: number; w: number; h: number }): string {
    return `${imageUri}?crop=${box.x},${box.y},${box.w},${box.h}`;
  }
}
export * from "../types";
