import { DiagramNode, DiagramGraph, RecognitionConfidence, LayoutStrategy } from "../types";
import { SemanticAnalyzer } from "../semantic/analyzer";
import { LayoutEngine } from "../layout/engine";
import { GraphEngine } from "../graph/engine";

export class SketchToDiagramEngine {
  private analyzer: SemanticAnalyzer;
  private layout: LayoutEngine;

  constructor(proximityThreshold?: number) {
    this.analyzer = new SemanticAnalyzer(proximityThreshold);
    this.layout = new LayoutEngine();
  }

  /**
   * Main pipeline orchestrator: maps coordinates connectors to box edges,
   * classifies categories and computes clean topological layout nodes coordinates.
   */
  public recognizeDiagram(
    rawNodes: DiagramNode[],
    rawConnectors: { id: string; startX: number; startY: number; endX: number; endY: number }[]
  ): { graph: DiagramGraph; confidence: RecognitionConfidence } {
    const startTime = Date.now();

    // 1. Detect relationship edges
    const edges = this.analyzer.detectConnections(rawNodes, rawConnectors);
    const initialGraph: DiagramGraph = { nodes: rawNodes, edges };

    // 2. Classify categories
    const diagramType = this.analyzer.classifyDiagram(initialGraph);

    // 3. Resolve layout strategy matching category
    let strategy: LayoutStrategy = "grid";
    if (diagramType === "flowchart" || diagramType === "uml") {
      strategy = "hierarchical";
    } else if (diagramType === "mindmap") {
      strategy = "radial";
    }

    // 4. Compute layouts
    const finalGraph = this.layout.applyLayout(initialGraph, strategy);

    // 5. Build confidence metrics
    const overallConfidence = 0.85; // Simulated base target metric
    const nodeConfidence = 0.90;
    const edgeConfidence = 0.80;

    const confidence: RecognitionConfidence = {
      diagramType,
      overallConfidence,
      nodeConfidence,
      edgeConfidence,
      timeMs: Date.now() - startTime
    };

    return {
      graph: finalGraph,
      confidence
    };
  }

  /**
   * Applies a specific layout strategy manually.
   */
  public applyLayout(graph: DiagramGraph, strategy: LayoutStrategy): DiagramGraph {
    return this.layout.applyLayout(graph, strategy);
  }

  /**
   * Validates cycle presence or orphan nodes.
   */
  public validateDiagram(graph: DiagramGraph): { hasCycle: boolean; orphanNodes: string[] } {
    const graphEngine = new GraphEngine(graph);
    return {
      hasCycle: graphEngine.hasCycle(),
      orphanNodes: graphEngine.getOrphanNodes()
    };
  }
}
