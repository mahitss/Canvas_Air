import { describe, it, expect, vi } from "vitest";
import { LayoutAnalyzer } from "../src/layout/analyzer";
import { DiagramGenerator } from "../src/generation/diagram_generator";
import { AutoLayoutEngine } from "../src/layout/auto_layout";
import { ProviderFrameworkRegistry, IDiagramClassifierProvider } from "../src/recognition/provider_framework";
import { DiagramIntegrationManager } from "../src/integration/diagram_integration";
import { SketchRawInput } from "../src/domain";

describe("AI Sketch-to-Diagram Advanced Layout & Integration Engine", () => {
  it("should analyze spatial positioning, alignment, overlaps, and reading directions", () => {
    const analyzer = new LayoutAnalyzer();

    const rep = {
      shapes: [
        { id: "s1", shapeType: "rectangle" as const, x: 100, y: 100, w: 50, h: 50 },
        { id: "s2", shapeType: "circle" as const, x: 105, y: 300, w: 50, h: 50 } // Vertically aligned
      ],
      connectors: [],
      texts: [],
      containments: []
    };

    const meta = analyzer.analyze(rep);
    expect(meta.readingDirection).toBe("top-to-bottom");
    expect(meta.alignments.length).toBe(1);
    expect(meta.alignments[0]?.axis).toBe("vertical");
  });

  it("should generate editable ports, nodes, edges, and container zones", () => {
    const generator = new DiagramGenerator();

    const graph = {
      nodes: [
        { id: "n1", type: "circle", label: "Start" },
        { id: "n2", type: "box", label: "Step" }
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2", type: "arrow", label: "dependency" }
      ],
      hierarchy: new Map(),
      containments: new Map([["n1", ["n2"]]])
    };

    const diagram = generator.generate(graph);
    expect(diagram.nodes.length).toBe(2);
    expect(diagram.nodes[0]?.ports.length).toBe(4); // top, bottom, left, right
    expect(diagram.edges.length).toBe(1);
    expect(diagram.containers.length).toBe(1);
  });

  it("should execute auto-layout strategies and trigger step layout animation callbacks", () => {
    const engine = new AutoLayoutEngine();

    const diagram = {
      nodes: [
        { id: "n1", type: "circle", x: 0, y: 0, w: 50, h: 50, label: "Start", ports: [], properties: {} },
        { id: "n2", type: "box", x: 0, y: 0, w: 50, h: 50, label: "Step", ports: [], properties: {} }
      ],
      edges: [],
      containers: [],
      metadata: { generatedAt: 100, engineVersion: "2.0.0" }
    };

    engine.configure({ spacingX: 100 });
    const animCallback = vi.fn();

    const result = engine.applyLayout(diagram, "grid", animCallback);
    expect(result.nodes[1]?.x).toBe(100); // cols=3 spacingX=100
    expect(animCallback).toHaveBeenCalledTimes(1);
  });

  it("should register classifier providers and evaluate health checking indicators", async () => {
    const registry = new ProviderFrameworkRegistry();

    const mockProvider: IDiagramClassifierProvider = {
      name: "CloudAI",
      type: "cloud",
      version: "1.0",
      capabilities: {
        supportedDiagramTypes: ["flowchart"],
        maxNodesLimit: 50,
        multiLabelEnabled: true
      },
      checkHealth: async () => "healthy",
      classify: async () => ({
        primaryType: "flowchart",
        confidenceScore: 0.9,
        labels: [],
        timeMs: 10
      })
    };

    registry.registerProvider(mockProvider);
    expect(registry.getActiveProvider()).toBe(mockProvider);

    const health = await registry.getActiveProvider()?.checkHealth();
    expect(health).toBe("healthy");
  });

  it("should process multi-modal integrations with handwriting recognition and shape recognition providers", async () => {
    const manager = new DiagramIntegrationManager();

    const rawInput: SketchRawInput = {
      elements: [
        {
          id: "e1",
          type: "shape",
          geometry: { x: 100, y: 100, w: 50, h: 50 },
          properties: {} // missing shapeType
        },
        {
          id: "e2",
          type: "text",
          geometry: { x: 110, y: 110, w: 20, h: 10 },
          properties: {} // missing text content
        }
      ]
    };

    const shapeProvider = {
      classifyShape: async () => "circle"
    };

    const handwritingProvider = {
      recognizeText: async () => "Integrate"
    };

    const orchestratorClient = {
      publishDiagramParsed: vi.fn()
    };

    const res = await manager.processMultiModalSketch(rawInput, {
      shapeRecognitionProvider: shapeProvider,
      handwritingProvider: handwritingProvider,
      orchestratorClient
    });

    expect(res.diagram.nodes.length).toBe(1);
    expect(res.diagram.nodes[0]?.type).toBe("circle");
    expect(res.diagram.nodes[0]?.label).toBe("Integrate");
    expect(orchestratorClient.publishDiagramParsed).toHaveBeenCalled();
  });
});
