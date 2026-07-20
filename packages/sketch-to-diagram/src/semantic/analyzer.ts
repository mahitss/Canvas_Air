import { DiagramNode, DiagramEdge, DiagramType, DiagramGraph } from "../types";
import { DIAGRAM_DEFAULT_CONFIG } from "../config";

export class SemanticAnalyzer {
  private proximityThreshold: number;

  constructor(proximityThreshold: number = DIAGRAM_DEFAULT_CONFIG.proximityThreshold) {
    this.proximityThreshold = proximityThreshold;
  }

  /**
   * Resolves connector coordinate lines to graph edges based on spatial bounding proximity.
   */
  public detectConnections(
    nodes: DiagramNode[],
    connectors: { id: string; startX: number; startY: number; endX: number; endY: number }[]
  ): DiagramEdge[] {
    const edges: DiagramEdge[] = [];

    for (const conn of connectors) {
      let fromNode: DiagramNode | null = null;
      let toNode: DiagramNode | null = null;

      let minStartDist = Infinity;
      let minEndDist = Infinity;

      for (const node of nodes) {
        // Calculate distance from connector start to node center
        const centerX = node.x + node.w / 2;
        const centerY = node.y + node.h / 2;

        const distStart = Math.hypot(conn.startX - centerX, conn.startY - centerY);
        const distEnd = Math.hypot(conn.endX - centerX, conn.endY - centerY);

        if (distStart < minStartDist && distStart <= this.proximityThreshold) {
          minStartDist = distStart;
          fromNode = node;
        }

        if (distEnd < minEndDist && distEnd <= this.proximityThreshold) {
          minEndDist = distEnd;
          toNode = node;
        }
      }

      // If both source and target boxes are resolved, append a connection edge
      if (fromNode && toNode && fromNode.id !== toNode.id) {
        edges.push({
          id: conn.id,
          fromId: fromNode.id,
          toId: toNode.id,
          type: "connector"
        });
      }
    }

    return edges;
  }

  /**
   * Heuristically determines diagram categories from nodes label contents and structural topologies.
   */
  public classifyDiagram(graph: DiagramGraph): DiagramType {
    const nodeLabels = graph.nodes.map(n => n.label?.toLowerCase() || "");
    
    // Heuristic 1: If class patterns exist, label UML diagram
    if (nodeLabels.some(lbl => lbl.includes("class") || lbl.includes("interface") || lbl.includes("extends"))) {
      return "uml";
    }

    // Heuristic 2: If central node dominates and branching matches mindmap layout
    const rootNodes = graph.nodes.filter(n => n.type === "central_root" || n.label?.toLowerCase() === "root");
    if (rootNodes.length > 0) {
      return "mindmap";
    }

    // Heuristic 3: Check for diamond decision shapes or standard flowchart keywords
    const hasDiamonds = graph.nodes.some(n => n.type === "diamond");
    const hasFlowchartKeywords = nodeLabels.some(lbl => lbl.includes("start") || lbl.includes("end") || lbl.includes("yes") || lbl.includes("no"));
    if (hasDiamonds || hasFlowchartKeywords) {
      return "flowchart";
    }

    return "architecture";
  }
}
export * from "../types";
export * from "../config";
export * from "../graph/engine";
export * from "../layout/engine";
export * from "../recognition/engine";
