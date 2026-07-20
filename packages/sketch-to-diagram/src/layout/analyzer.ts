import { SemanticRepresentation } from "../domain";

export interface LayoutMetadata {
  alignments: { shapeId: string; axis: "horizontal" | "vertical"; targetShapeId: string }[];
  overlaps: { shapeId1: string; shapeId2: string }[];
  readingDirection: "left-to-right" | "top-to-bottom";
  proximities: { shapeId1: string; shapeId2: string; distance: number }[];
}

export class LayoutAnalyzer {
  private alignmentThreshold = 10;
  private proximityThreshold = 120;

  /**
   * Evaluates spatial coordinates to detect alignments, overlaps, reading order, and distances.
   */
  public analyze(rep: SemanticRepresentation): LayoutMetadata {
    const alignments: { shapeId: string; axis: "horizontal" | "vertical"; targetShapeId: string }[] = [];
    const overlaps: { shapeId1: string; shapeId2: string }[] = [];
    const proximities: { shapeId1: string; shapeId2: string; distance: number }[] = [];

    const shapes = rep.shapes;

    // 1. Detect alignments, overlaps, and proximities between all pairs of shapes
    for (let i = 0; i < shapes.length; i++) {
      const s1 = shapes[i]!;
      for (let j = i + 1; j < shapes.length; j++) {
        const s2 = shapes[j]!;

        // Proximity distance
        const dx = (s1.x + s1.w / 2) - (s2.x + s2.w / 2);
        const dy = (s1.y + s1.h / 2) - (s2.y + s2.h / 2);
        const distance = Math.hypot(dx, dy);

        if (distance <= this.proximityThreshold) {
          proximities.push({ shapeId1: s1.id, shapeId2: s2.id, distance });
        }

        // Alignments check
        if (Math.abs(s1.y - s2.y) <= this.alignmentThreshold) {
          alignments.push({ shapeId: s1.id, axis: "horizontal", targetShapeId: s2.id });
        }
        if (Math.abs(s1.x - s2.x) <= this.alignmentThreshold) {
          alignments.push({ shapeId: s1.id, axis: "vertical", targetShapeId: s2.id });
        }

        // Overlaps check
        if (
          s1.x < s2.x + s2.w &&
          s1.x + s1.w > s2.x &&
          s1.y < s2.y + s2.h &&
          s1.y + s1.h > s2.y
        ) {
          // Verify s1 is not a full containment of s2 or vice versa
          const isContained =
            (s2.x >= s1.x && s2.x + s2.w <= s1.x + s1.w && s2.y >= s1.y && s2.y + s2.h <= s1.y + s1.h) ||
            (s1.x >= s2.x && s1.x + s1.w <= s2.x + s2.w && s1.y >= s2.y && s1.y + s1.h <= s2.y + s2.h);

          if (!isContained) {
            overlaps.push({ shapeId1: s1.id, shapeId2: s2.id });
          }
        }
      }
    }

    // 2. Resolve Reading Direction (Left-to-Right vs Top-to-Bottom)
    let horizontalSpan = 0;
    let verticalSpan = 0;

    if (shapes.length > 1) {
      const xs = shapes.map((s) => s.x);
      const ys = shapes.map((s) => s.y);
      horizontalSpan = Math.max(...xs) - Math.min(...xs);
      verticalSpan = Math.max(...ys) - Math.min(...ys);
    }

    const readingDirection = horizontalSpan >= verticalSpan ? "left-to-right" : "top-to-bottom";

    return {
      alignments,
      overlaps,
      readingDirection,
      proximities
    };
  }
}
