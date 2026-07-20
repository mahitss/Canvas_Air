import { DetectedObject, SceneGraph, SceneNode, SceneRelationship } from "../types";
import { DEFAULT_DETECTION_CONFIG } from "../config";

export class SceneGraphManager {
  private adjacencyThreshold: number;

  constructor(adjacencyThreshold: number = DEFAULT_DETECTION_CONFIG.spatialAdjacencyThreshold) {
    this.adjacencyThreshold = adjacencyThreshold;
  }

  /**
   * Constructs spatial adjacency, overlap, and containment graphs of detected elements.
   */
  public generateSceneGraph(objects: DetectedObject[]): SceneGraph {
    const nodes: SceneNode[] = objects.map(obj => {
      const node: SceneNode = {
        id: obj.id,
        label: obj.label,
        x: obj.x,
        y: obj.y,
        w: obj.w,
        h: obj.h
      };
      if (obj.trackingId !== undefined) {
        node.trackingId = obj.trackingId;
      }
      return node;
    });

    const relationships: SceneRelationship[] = [];

    for (let i = 0; i < objects.length; i++) {
      const objA = objects[i];
      if (!objA) continue;

      for (let j = 0; j < objects.length; j++) {
        if (i === j) continue;
        const objB = objects[j];
        if (!objB) continue;

        // 1. Evaluate Containment (A contained inside B)
        const isContained =
          objA.x >= objB.x &&
          objA.y >= objB.y &&
          objA.x + objA.w <= objB.x + objB.w &&
          objA.y + objA.h <= objB.y + objB.h;

        if (isContained) {
          relationships.push({
            fromId: objA.id,
            toId: objB.id,
            type: "containment"
          });
          continue;
        }

        // 2. Evaluate Overlaps (A intersects B)
        const isOverlapping =
          objA.x < objB.x + objB.w &&
          objA.x + objA.w > objB.x &&
          objA.y < objB.y + objB.h &&
          objA.y + objA.h > objB.y;

        if (isOverlapping) {
          relationships.push({
            fromId: objA.id,
            toId: objB.id,
            type: "overlap"
          });
          continue;
        }

        // 3. Evaluate Adjacency (A close to B borders)
        const distLeftRight = Math.abs(objA.x + objA.w - objB.x);
        const distRightLeft = Math.abs(objB.x + objB.w - objA.x);
        const distTopBottom = Math.abs(objA.y + objA.h - objB.y);
        const distBottomTop = Math.abs(objB.y + objB.h - objA.y);

        const isAdjacent =
          distLeftRight < this.adjacencyThreshold ||
          distRightLeft < this.adjacencyThreshold ||
          distTopBottom < this.adjacencyThreshold ||
          distBottomTop < this.adjacencyThreshold;

        if (isAdjacent) {
          relationships.push({
            fromId: objA.id,
            toId: objB.id,
            type: "adjacency"
          });
        }
      }
    }

    return {
      nodes,
      relationships
    };
  }
}
export * from "../types";
export * from "../config";
export * from "../tracking/engine";
export * from "../segmentation/engine";
export * from "../detection/engine";
