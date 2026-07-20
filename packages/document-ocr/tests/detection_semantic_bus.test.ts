import { describe, it, expect, vi } from "vitest";
import { DocumentDetectionEngine } from "../src/detection/detection_engine";
import { SemanticDocumentEngine } from "../src/semantic/semantic_engine";
import { PlatformIntegrationManager } from "../src/integration/platform_integration";
import { DocIntelEventBus } from "../src/events/event_bus";
import { DocIntelOptimizer } from "../src/debug/optimizations";
import { StructuredDocumentModel } from "../src/domain";

describe("Document Intelligence Detection, Semantics, Bus & Cache Options", () => {
  it("should detect signatures, stamps and logo metadata regions", () => {
    const engine = new DocumentDetectionEngine();

    const objects = engine.detectObjects("Approved stamp by company. Show logo here.", { w: 1000, height: 800 });
    const stamp = objects.find(o => o.type === "stamp");
    const logo = objects.find(o => o.type === "logo");

    expect(stamp).toBeDefined();
    expect(logo).toBeDefined();
    expect(stamp?.boundingBox.x).toBe(820); // 1000 - 180
  });

  it("should classify semantic topics and synthesize summaries", () => {
    const engine = new SemanticDocumentEngine();

    const result = engine.analyzeSemantics(
      "Financial report for FY2026. Revenue has doubled. Detailed graph metrics follow.",
      ["sec-1", "sec-2"]
    );

    expect(result.topics).toContain("Finance");
    expect(result.summary).toBe("Financial report for FY2026.  Revenue has doubled.");
    expect(result.relationships[0]?.type).toBe("elaborates");
    expect(result.graph.nodes[0]?.type).toBe("topic");
  });

  it("should map parsed blocks to standard canvas rendering elements", () => {
    const integration = new PlatformIntegrationManager();

    const mockDoc: StructuredDocumentModel = {
      id: "doc-123",
      sourceUri: "local://source.pdf",
      pages: [
        {
          pageNumber: 1,
          dimensions: { width: 800, height: 600 },
          regions: [
            {
              id: "r1",
              role: "body",
              boundingBox: { x: 0, y: 0, w: 800, h: 600 },
              blocks: [
                {
                  id: "b1",
                  type: "text",
                  content: "Integrated text content",
                  boundingBox: { x: 50, y: 50, w: 200, h: 30 },
                  confidence: 0.99
                }
              ]
            }
          ]
        }
      ],
      metadata: {
        title: "Title",
        author: "Author",
        pageCount: 1,
        fileSizeBytes: 100,
        extractedEntities: []
      }
    };

    const layers = integration.convertToCanvasLayers(mockDoc);
    expect(layers.length).toBe(1);
    expect(layers[0]?.type).toBe("text");
    expect(layers[0]?.properties.content).toBe("Integrated text content");
    expect(layers[0]?.properties.sourceMetadata.docId).toBe("doc-123");
  });

  it("should publish and trace subscriber events using the event bus", () => {
    const bus = DocIntelEventBus.getInstance();
    bus.clearHistory();

    const handler = vi.fn();
    bus.subscribe("ParsingStarted", handler);

    bus.publish("ParsingStarted", { docId: "doc-1" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.getHistory().length).toBe(1);
  });

  it("should retrieve cached OCR outputs and use pre-allocated buffers", () => {
    DocIntelOptimizer.clearCache();

    const mockOcr = {
      text: "cached",
      confidence: 1.0,
      regions: [],
      segments: []
    };

    expect(DocIntelOptimizer.getCachedOcr("doc-uri")).toBeNull();

    DocIntelOptimizer.cacheOcr("doc-uri", mockOcr);
    expect(DocIntelOptimizer.getCachedOcr("doc-uri")).toEqual(mockOcr);

    const memoryBuffer = DocIntelOptimizer.fillMemoryBuffer([1, 2, 3]);
    expect(memoryBuffer.length).toBe(3);
  });
});
