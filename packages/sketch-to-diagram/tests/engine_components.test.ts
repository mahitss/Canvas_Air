import { describe, it, expect } from "vitest";
import { SketchParser } from "../src/parser/sketch_parser";
import { DiagramClassifier, DefaultClassifierModelProvider } from "../src/recognition/classifier";
import { RelationshipEngine } from "../src/semantic/relationship_engine";
import { SketchRawInput } from "../src/domain";

describe("Sketch-to-Diagram AI Engine Components", () => {
  it("should parse and normalize coordinates, associate text, and detect containments", () => {
    const parser = new SketchParser();
    
    const input: SketchRawInput = {
      elements: [
        {
          id: "shape-1",
          type: "shape",
          geometry: { x: 100, y: 100, w: 200, h: 200 },
          properties: { shapeType: "rectangle" }
        },
        {
          id: "shape-2",
          type: "shape",
          geometry: { x: 120, y: 120, w: 50, h: 50 },
          properties: { shapeType: "circle" }
        },
        {
          id: "text-1",
          type: "text",
          geometry: { x: 130, y: 130, w: 20, h: 10 },
          properties: { text: "Node Name" }
        },
        {
          id: "conn-1",
          type: "arrow",
          geometry: {
            x: 0, y: 0, w: 0, h: 0,
            points: [{ x: 50, y: 50 }, { x: 90, y: 90 }]
          }
        }
      ]
    };

    const rep = parser.parse(input);

    // Text association check: text-1 is inside shape-2, shape-2 is inside shape-1.
    // Shape 2 is first container, should receive associated text
    const shape2 = rep.shapes.find((s) => s.id === "shape-2");
    expect(shape2?.associatedText).toBe("Node Name");

    // Containment check: shape-2 is contained inside shape-1
    expect(rep.containments.length).toBe(1);
    expect(rep.containments[0]).toEqual({ parentId: "shape-1", childId: "shape-2" });

    // Connectors check
    expect(rep.connectors.length).toBe(1);
    expect(rep.connectors[0]?.startX).toBe(50);
  });

  it("should classify UML class, mind maps, network diagrams, and org charts with confidence scores", async () => {
    const classifier = new DiagramClassifier();

    // 1. UML Class representation
    const umlRep = {
      shapes: [{ id: "s1", shapeType: "rectangle" as const, x: 0, y: 0, w: 10, h: 10 }],
      connectors: [],
      texts: [{ id: "t1", content: "class Student", x: 1, y: 1 }],
      containments: []
    };

    const umlRes = await classifier.classify(umlRep);
    expect(umlRes.primaryType).toBe("UML Class Diagram");
    expect(umlRes.confidenceScore).toBeGreaterThanOrEqual(0.9);

    // 2. Org Chart representation
    const orgRep = {
      shapes: [{ id: "s1", shapeType: "rectangle" as const, x: 0, y: 0, w: 10, h: 10 }],
      connectors: [],
      texts: [{ id: "t1", content: "CEO", x: 1, y: 1 }],
      containments: []
    };

    const orgRes = await classifier.classify(orgRep);
    expect(orgRes.primaryType).toBe("Org Chart");
  });

  it("should construct relationship models detailing associations and hierachical parents", () => {
    const engine = new RelationshipEngine();

    const rep = {
      shapes: [
        { id: "s1", shapeType: "rectangle" as const, x: 0, y: 0, w: 10, h: 10, associatedText: "Parent" },
        { id: "s2", shapeType: "rectangle" as const, x: 200, y: 0, w: 10, h: 10, associatedText: "Child" }
      ],
      connectors: [
        // Arrow connecting s1 center to s2 center
        { id: "c1", type: "arrow" as const, startX: 5, startY: 5, endX: 205, endY: 5 }
      ],
      texts: [],
      containments: [{ parentId: "s1", childId: "s2" }]
    };

    const graph = engine.analyze(rep);

    // Connection check
    expect(graph.edges.length).toBe(1);
    expect(graph.edges[0]?.from).toBe("s1");
    expect(graph.edges[0]?.to).toBe("s2");

    // Containment check
    expect(graph.containments.get("s1")).toContain("s2");

    // Hierarchy check: s1 has child s2 because of arrow connector
    expect(graph.hierarchy.get("s1")).toContain("s2");
  });
});
