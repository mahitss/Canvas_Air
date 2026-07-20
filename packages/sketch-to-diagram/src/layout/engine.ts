import { DiagramGraph, LayoutStrategy, DiagramNode } from "../types";

export class LayoutEngine {
  /**
   * Calculates node coordinate placements according to the specified layout strategy.
   */
  public applyLayout(graph: DiagramGraph, strategy: LayoutStrategy): DiagramGraph {
    // Clone nodes array to avoid directly mutating parameters
    const nodes = graph.nodes.map(n => ({ ...n }));
    const edges = graph.edges;

    if (nodes.length === 0) return { nodes, edges };

    switch (strategy) {
      case "hierarchical":
        this.layoutHierarchical(nodes, edges);
        break;
      case "radial":
        this.layoutRadial(nodes, edges);
        break;
      case "grid":
      default:
        this.layoutGrid(nodes);
        break;
    }

    return { nodes, edges };
  }

  private layoutHierarchical(nodes: DiagramNode[], edges: any[]): void {
    // Determine layer levels for each node by traversing dependencies
    const layers: Record<string, number> = {};
    const inDegree: Record<string, number> = {};

    for (const node of nodes) {
      layers[node.id] = 0;
      inDegree[node.id] = 0;
    }

    for (const edge of edges) {
      inDegree[edge.toId] = (inDegree[edge.toId] || 0) + 1;
    }

    // Process nodes with in-degree = 0 first
    const queue: string[] = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
    const firstNode = nodes[0];
    if (queue.length === 0 && firstNode) {
      queue.push(firstNode.id); // Fallback if cyclic
    }

    const processed = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (processed.has(currentId)) continue;
      processed.add(currentId);

      const currentLayer = layers[currentId];
      const children = edges.filter(e => e.fromId === currentId).map(e => e.toId);

      for (const child of children) {
        layers[child] = Math.max(layers[child] || 0, (currentLayer ?? 0) + 1);
        queue.push(child);
      }
    }

    // Group nodes by layer index
    const layerGroups: Record<number, string[]> = {};
    for (const [nodeId, layer] of Object.entries(layers)) {
      if (!layerGroups[layer]) {
        layerGroups[layer] = [];
      }
      layerGroups[layer].push(nodeId);
    }

    // Position coordinates
    const layerSpacingY = 150;
    const nodeSpacingX = 180;

    for (const [layerStr, nodeIds] of Object.entries(layerGroups)) {
      const layerNum = Number(layerStr);
      const totalWidth = (nodeIds.length - 1) * nodeSpacingX;
      const startX = -totalWidth / 2;

      for (let i = 0; i < nodeIds.length; i++) {
        const targetNode = nodes.find(n => n.id === nodeIds[i]);
        if (targetNode) {
          targetNode.x = startX + i * nodeSpacingX;
          targetNode.y = layerNum * layerSpacingY;
        }
      }
    }
  }

  private layoutRadial(nodes: DiagramNode[], edges: any[]): void {
    const centralNode = nodes[0];
    if (!centralNode) return;
    centralNode.x = 0;
    centralNode.y = 0;

    const children = edges.filter(e => e.fromId === centralNode.id).map(e => e.toId);
    const radius = 180;

    let index = 0;
    const angleStep = (2 * Math.PI) / Math.max(children.length, 1);

    for (const nodeId of children) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const theta = index * angleStep;
        node.x = Math.round(radius * Math.cos(theta));
        node.y = Math.round(radius * Math.sin(theta));
        index++;
      }
    }

    // Distribute remaining unconnected nodes in secondary outer rings
    const positioned = new Set([centralNode.id, ...children]);
    let outerIndex = 0;
    const remaining = nodes.filter(n => !positioned.has(n.id));
    const outerStep = (2 * Math.PI) / Math.max(remaining.length, 1);

    for (const node of remaining) {
      const theta = outerIndex * outerStep;
      node.x = Math.round(radius * 1.8 * Math.cos(theta));
      node.y = Math.round(radius * 1.8 * Math.sin(theta));
      outerIndex++;
    }
  }

  private layoutGrid(nodes: DiagramNode[]): void {
    const colCount = Math.ceil(Math.sqrt(nodes.length));
    const spacingX = 180;
    const spacingY = 150;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node) {
        const row = Math.floor(i / colCount);
        const col = i % colCount;
        node.x = col * spacingX;
        node.y = row * spacingY;
      }
    }
  }
}
