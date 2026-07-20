import { IRelationshipEngine } from "../interfaces";
import { SemanticRepresentation, RelationshipGraph } from "../domain";
import { RelationshipException } from "../errors";

export class RelationshipEngine implements IRelationshipEngine {
  private proximityThreshold = 50;

  /**
   * Builds structural relationship graphs mapping shapes, text contents, connections, and containments.
   */
  public analyze(rep: SemanticRepresentation): RelationshipGraph {
    if (!rep) {
      throw new RelationshipException("Semantic representation is null");
    }

    const nodes = rep.shapes.map((s) => ({
      id: s.id,
      type: s.shapeType,
      label: s.associatedText
    }));

    const edges: { id: string; from: string; to: string; type: string; label: string | undefined }[] = [];
    const hierarchy = new Map<string, string[]>();
    const containments = new Map<string, string[]>();

    // 1. Resolve Connections: resolve connectors endpoints to closest shapes
    for (const conn of rep.connectors) {
      let fromId = conn.fromShapeId;
      let toId = conn.toShapeId;

      if (!fromId || !toId) {
        let minStartDist = Infinity;
        let minEndDist = Infinity;

        for (const shape of rep.shapes) {
          const centerX = shape.x + shape.w / 2;
          const centerY = shape.y + shape.h / 2;

          const distStart = Math.hypot(conn.startX - centerX, conn.startY - centerY);
          const distEnd = Math.hypot(conn.endX - centerX, conn.endY - centerY);

          if (distStart < minStartDist && distStart <= this.proximityThreshold) {
            minStartDist = distStart;
            fromId = shape.id;
          }

          if (distEnd < minEndDist && distEnd <= this.proximityThreshold) {
            minEndDist = distEnd;
            toId = shape.id;
          }
        }
      }

      if (fromId && toId && fromId !== toId) {
        edges.push({
          id: conn.id,
          from: fromId,
          to: toId,
          type: conn.type,
          label: conn.type === "arrow" ? "dependency" : "association"
        });
      }
    }

    // 2. Resolve Containments Map
    for (const contain of rep.containments) {
      let list = containments.get(contain.parentId);
      if (!list) {
        list = [];
        containments.set(contain.parentId, list);
      }
      list.push(contain.childId);
    }

    // 3. Resolve Hierarchy Map (parent-child dependencies)
    // In standard flowcharts/trees, parent-child can be inferred from direct arrow connections
    for (const edge of edges) {
      if (edge.type === "arrow") {
        let children = hierarchy.get(edge.from);
        if (!children) {
          children = [];
          hierarchy.set(edge.from, children);
        }
        children.push(edge.to);
      }
    }

    return {
      nodes,
      edges,
      hierarchy,
      containments
    };
  }
}
