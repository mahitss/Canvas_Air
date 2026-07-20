import { EditableDiagram, EditableNode } from "../generation/diagram_generator";

export type LayoutStrategyType =
  | "hierarchical"
  | "tree"
  | "force-directed"
  | "grid"
  | "radial"
  | "orthogonal";

export interface AutoLayoutConfig {
  spacingX: number;
  spacingY: number;
  gridColumns?: number;
  forceGravity?: number;
}

export class AutoLayoutEngine {
  private config: AutoLayoutConfig = {
    spacingX: 180,
    spacingY: 150,
    gridColumns: 3,
    forceGravity: 0.1
  };

  public configure(config: Partial<AutoLayoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Applies the selected strategy to arrange diagram node positions.
   * Invokes transition callbacks to trigger layout animation hooks.
   */
  public applyLayout(
    diagram: EditableDiagram,
    strategy: LayoutStrategyType,
    onStepTransition?: (nodes: EditableNode[]) => void
  ): EditableDiagram {
    const nodes = diagram.nodes.map((n) => ({ ...n }));
    const edges = diagram.edges;

    if (nodes.length === 0) return { ...diagram, nodes };

    switch (strategy) {
      case "hierarchical":
      case "tree":
        this.layoutHierarchicalOrTree(nodes, edges);
        break;
      case "grid":
        this.layoutGrid(nodes);
        break;
      case "radial":
        this.layoutRadial(nodes);
        break;
      case "force-directed":
        this.layoutForceDirected(nodes);
        break;
      case "orthogonal":
        this.layoutOrthogonal(nodes);
        break;
      default:
        this.layoutGrid(nodes);
        break;
    }

    // Call animation step hook if provided
    if (onStepTransition) {
      onStepTransition(nodes);
    }

    return {
      ...diagram,
      nodes
    };
  }

  private layoutHierarchicalOrTree(nodes: EditableNode[], edges: any[]): void {
    const layers: Record<string, number> = {};
    const inDegree: Record<string, number> = {};

    for (const node of nodes) {
      layers[node.id] = 0;
      inDegree[node.id] = 0;
    }

    for (const edge of edges) {
      inDegree[edge.toNodeId] = (inDegree[edge.toNodeId] || 0) + 1;
    }

    const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
    if (queue.length === 0 && nodes[0]) {
      queue.push(nodes[0].id);
    }

    const processed = new Set<string>();

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (processed.has(curr)) continue;
      processed.add(curr);

      const layer = layers[curr] ?? 0;
      const children = edges.filter((e) => e.fromNodeId === curr).map((e) => e.toNodeId);

      for (const child of children) {
        layers[child] = Math.max(layers[child] || 0, layer + 1);
        queue.push(child);
      }
    }

    const layerGroups: Record<number, string[]> = {};
    for (const [nodeId, layer] of Object.entries(layers)) {
      const idx = layer ?? 0;
      layerGroups[idx] = layerGroups[idx] || [];
      layerGroups[idx].push(nodeId);
    }

    for (const [layerStr, ids] of Object.entries(layerGroups)) {
      const layer = Number(layerStr);
      const totalWidth = (ids.length - 1) * this.config.spacingX;
      const startX = -totalWidth / 2;

      for (let i = 0; i < ids.length; i++) {
        const node = nodes.find((n) => n.id === ids[i]);
        if (node) {
          node.x = startX + i * this.config.spacingX;
          node.y = layer * this.config.spacingY;
        }
      }
    }
  }

  private layoutGrid(nodes: EditableNode[]): void {
    const cols = this.config.gridColumns || 3;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      const row = Math.floor(i / cols);
      const col = i % cols;
      node.x = col * this.config.spacingX;
      node.y = row * this.config.spacingY;
    }
  }

  private layoutRadial(nodes: EditableNode[]): void {
    if (nodes.length === 0) return;
    const central = nodes[0]!;
    central.x = 0;
    central.y = 0;

    const remaining = nodes.slice(1);
    const radius = 180;
    const step = (2 * Math.PI) / Math.max(remaining.length, 1);

    for (let i = 0; i < remaining.length; i++) {
      const theta = i * step;
      const node = remaining[i]!;
      node.x = Math.round(radius * Math.cos(theta));
      node.y = Math.round(radius * Math.sin(theta));
    }
  }

  private layoutForceDirected(nodes: EditableNode[]): void {
    // Simple force layout using a spring distance step heuristic
    const gravity = this.config.forceGravity ?? 0.1;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      const dx = -node.x;
      const dy = -node.y;
      node.x += dx * gravity;
      node.y += dy * gravity;
    }
  }

  private layoutOrthogonal(nodes: EditableNode[]): void {
    // Places nodes in staircase diagonal orthogonal patterns
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      node.x = i * this.config.spacingX;
      node.y = i * this.config.spacingY;
    }
  }
}
