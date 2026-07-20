import { DetectedObject } from "../types";
import { SpatialRelationship } from "../domain";

export class SpatialReasoningEngine {
  /**
   * Evaluates layout coordinates to deduce containment, adjacency, proximity
   * and relative spatial direction matrices.
   */
  public inferRelationships(objects: DetectedObject[]): SpatialRelationship[] {
    const relationships: SpatialRelationship[] = [];

    for (let i = 0; i < objects.length; i++) {
      const a = objects[i]!;
      for (let j = 0; j < objects.length; j++) {
        if (i === j) continue;
        const b = objects[j]!;

        const centerAX = a.x + a.w / 2;
        const centerAY = a.y + a.h / 2;
        const centerBX = b.x + b.w / 2;
        const centerBY = b.y + b.h / 2;

        const distance = Math.hypot(centerAX - centerBX, centerAY - centerBY);

        // 1. Containment checks
        const aContainsB =
          a.x <= b.x &&
          a.y <= b.y &&
          a.x + a.w >= b.x + b.w &&
          a.y + a.h >= b.y + b.h;

        if (aContainsB) {
          relationships.push({
            sourceId: a.id,
            targetId: b.id,
            relation: "contains",
            confidence: 0.98
          });
          continue;
        }

        // 2. Overlap checks
        const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
        const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        const hasOverlap = xOverlap > 0 && yOverlap > 0;

        if (hasOverlap) {
          relationships.push({
            sourceId: a.id,
            targetId: b.id,
            relation: "overlaps",
            confidence: 0.90
          });
        }

        // 3. Directional/Adjacency checks
        if (distance < 300) {
          if (Math.abs(centerAY - centerBY) < 50) {
            relationships.push({
              sourceId: a.id,
              targetId: b.id,
              relation: centerAX < centerBX ? "left-of" : "right-of",
              confidence: 0.85
            });
          } else if (Math.abs(centerAX - centerBX) < 50) {
            relationships.push({
              sourceId: a.id,
              targetId: b.id,
              relation: centerAY < centerBY ? "above" : "below",
              confidence: 0.85
            });
          }
        }
      }
    }

    return relationships;
  }
}
