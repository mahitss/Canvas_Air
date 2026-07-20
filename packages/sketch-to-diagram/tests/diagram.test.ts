import { describe, it, expect } from "vitest";
import { SketchToDiagramEngine } from "../src/recognition/engine";
import { GraphEngine } from "../src/graph/engine";
import { DiagramNode, DiagramEdge, DiagramGraph } from "../types";

describe("AI Sketch-to-Diagram Recognition Pipeline", () => {
  it("should map spatial proximity connectors to directed graph edges", () => {
    const engine = new SketchToDiagramEngine(40);

    const rawNodes: DiagramNode[] = [
      { id: "node-start", type: "circle", x: 100, y: 100, w: 60, h: 60, label: "Start" },
      { id: "node-step1", type: "box", x: 300, y: 100, w: 80, h: 50, label: "Process 1" }
    ];

    // Connector starts at start node center and ends at step1 node center
    const rawConnectors = [
      { id: "arrow-1", startX: 130, startY: 130, endX: 340, endY: 125 }
    ];

    const result = engine.recognizeDiagram(rawNodes, rawConnectors);
    expect(result.confidence.diagramType).toBe("flowchart");
    expect(result.graph.edges.length).toBe(1);
    
    const edge = result.graph.edges[0];
    expect(edge.fromId).toBe("node-start");
    expect(edge.toId).toBe("node-step1");
  });

  it("should compute topological coordinate layouts for hierarchical diagram types", () => {
    const engine = new SketchToDiagramEngine();

    const rawNodes: DiagramNode[] = [
      { id: "A", type: "circle", x: 100, y: 100, w: 60, h: 60, label: "start" },
      { id: "B", type: "box", x: 100, y: 100, w: 80, h: 50, label: "step" }
    ];

    const rawConnectors = [
      { id: "arrow-AB", startX: 130, startY: 130, endX: 140, endY: 125 }
    ];

    const result = engine.recognizeDiagram(rawNodes, rawConnectors);
    expect(result.confidence.diagramType).toBe("flowchart");

    // Hierarchical layout assigns layer levels.
    // Node A (inDegree = 0) is placed on Layer 0 (y = 0)
    // Node B is placed on Layer 1 (y = 150)
    const nodeA = result.graph.nodes.find(n => n.id === "A");
    const nodeB = result.graph.nodes.find(n => n.id === "B");

    expect(nodeA?.y).toBe(0);
    expect(nodeB?.y).toBe(150);
  });

  it("should identify cycle dependencies in diagram graphs", () => {
    const graph: DiagramGraph = {
      nodes: [
        { id: "A", type: "box", x: 0, y: 0, w: 50, h: 50 },
        { id: "B", type: "box", x: 0, y: 0, w: 50, h: 50 },
        { id: "C", type: "box", x: 0, y: 0, w: 50, h: 50 }
      ],
      edges: [
        { id: "e1", fromId: "A", toId: "B" },
        { id: "e2", fromId: "B", toId: "C" },
        { id: "e3", fromId: "C", toId: "A" } // Cycle: A -> B -> C -> A
      ]
    };

    const graphEngine = new GraphEngine(graph);
    expect(graphEngine.hasCycle()).toBe(true);
  });
});
