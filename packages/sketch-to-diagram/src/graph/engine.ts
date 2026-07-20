import { DiagramGraph, DiagramNode, DiagramEdge } from "../types";

export class GraphEngine {
  private graph: DiagramGraph;

  constructor(initialGraph?: DiagramGraph) {
    this.graph = initialGraph || { nodes: [], edges: [] };
  }

  public getGraph(): DiagramGraph {
    return this.graph;
  }

  public addNode(node: DiagramNode): void {
    if (!this.graph.nodes.some(n => n.id === node.id)) {
      this.graph.nodes.push(node);
    }
  }

  public addEdge(edge: DiagramEdge): void {
    if (!this.graph.edges.some(e => e.id === edge.id)) {
      this.graph.edges.push(edge);
    }
  }

  /**
   * Generates a standard directed adjacency list map.
   */
  public getAdjacencyList(): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const node of this.graph.nodes) {
      adj.set(node.id, []);
    }
    for (const edge of this.graph.edges) {
      if (adj.has(edge.fromId)) {
        adj.get(edge.fromId)!.push(edge.toId);
      }
    }
    return adj;
  }

  /**
   * Evaluates if any cyclic loop dependencies exist using depth-first search colors check.
   */
  public hasCycle(): boolean {
    const adj = this.getAdjacencyList();
    const visited = new Map<string, "white" | "gray" | "black" >(); // white=unvisited, gray=visiting, black=fully explored

    for (const node of this.graph.nodes) {
      visited.set(node.id, "white");
    }

    const dfs = (nodeId: string): boolean => {
      visited.set(nodeId, "gray");
      const children = adj.get(nodeId) || [];
      for (const child of children) {
        const color = visited.get(child);
        if (color === "gray") {
          return true; // Cycle found
        }
        if (color === "white") {
          if (dfs(child)) return true;
        }
      }
      visited.set(nodeId, "black");
      return false;
    };

    for (const node of this.graph.nodes) {
      if (visited.get(node.id) === "white") {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  /**
   * Asserts whether any node contains zero connection edges (either in-degree or out-degree).
   */
  public getOrphanNodes(): string[] {
    const connected = new Set<string>();
    for (const edge of this.graph.edges) {
      connected.add(edge.fromId);
      connected.add(edge.toId);
    }

    return this.graph.nodes
      .filter(node => !connected.has(node.id))
      .map(node => node.id);
  }
}
