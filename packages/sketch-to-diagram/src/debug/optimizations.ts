import { SemanticRepresentation, ClassificationResult, RelationshipGraph } from "../domain";

export class DiagramOptimizer {
  private static readonly classificationCache = new Map<string, ClassificationResult>();

  // Memory reuse: pre-allocated coordinate arrays
  private static readonly reusedNodeArray: any[] = new Array(5000);

  /**
   * Computes a unique hash signature for the semantic representation shapes/texts layout.
   */
  public static computeHash(rep: SemanticRepresentation): string {
    const shapeSummary = rep.shapes.map((s) => `${s.id}:${s.x},${s.y},${s.w},${s.h}`).join("|");
    const textSummary = rep.texts.map((t) => `${t.id}:${t.content}`).join("|");
    return `${shapeSummary}##${textSummary}`;
  }

  /**
   * Caching & Incremental Recognition: checks if the layout/contents are identical to skip processing.
   */
  public static getCachedClassification(rep: SemanticRepresentation): ClassificationResult | null {
    const hash = this.computeHash(rep);
    return this.classificationCache.get(hash) || null;
  }

  public static cacheClassification(rep: SemanticRepresentation, result: ClassificationResult): void {
    const hash = this.computeHash(rep);
    this.classificationCache.set(hash, result);
  }

  /**
   * Graph Optimization: collapses duplicate parallel edge associations between identical endpoints.
   */
  public static optimizeGraph(graph: RelationshipGraph): RelationshipGraph {
    const uniqueEdgesMap = new Map<string, typeof graph.edges[number]>();

    for (const edge of graph.edges) {
      const key = `${edge.from}->${edge.to}`;
      // Retain arrow type over line type if duplicate exists
      if (!uniqueEdgesMap.has(key) || edge.type === "arrow") {
        uniqueEdgesMap.set(key, edge);
      }
    }

    return {
      ...graph,
      edges: Array.from(uniqueEdgesMap.values())
    };
  }

  /**
   * Memory reuse helper: populates pre-allocated array slot positions to avoid garbage collection.
   */
  public static populateReusedBuffer(items: any[]): any[] {
    const limit = Math.min(items.length, this.reusedNodeArray.length);
    for (let i = 0; i < limit; i++) {
      this.reusedNodeArray[i] = items[i];
    }
    return this.reusedNodeArray.slice(0, limit);
  }
}
