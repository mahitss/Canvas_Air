import { describe, it, expect, vi } from "vitest";
import { DiagramEventBus } from "../src/events";
import { DiagramOptimizer } from "../src/debug/optimizations";
import { RelationshipGraph } from "../src/domain";

describe("AI Sketch-to-Diagram Events & Optimizations Engine", () => {
  it("should subscribe, publish events, and invoke event handlers", () => {
    const bus = DiagramEventBus.getInstance();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe("RecognitionStarted", handler);
    bus.publish("RecognitionStarted", { sketchId: "123" });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0]?.payload?.sketchId).toBe("123");

    unsubscribe();
    bus.publish("RecognitionStarted", { sketchId: "456" });
    expect(handler).toHaveBeenCalledTimes(1); // not called again
  });

  it("should cache and retrieve classification results accurately", () => {
    const rep1 = {
      shapes: [{ id: "s1", shapeType: "rectangle" as const, x: 0, y: 0, w: 100, h: 100 }],
      connectors: [],
      texts: [{ id: "t1", content: "Main Class", x: 10, y: 10 }],
      containments: []
    };

    const mockResult = {
      primaryType: "UML Class Diagram",
      confidenceScore: 0.95,
      labels: [],
      timeMs: 5
    };

    // Before cache
    expect(DiagramOptimizer.getCachedClassification(rep1)).toBeNull();

    // Cache it
    DiagramOptimizer.cacheClassification(rep1, mockResult);

    // Retrieve from cache
    const retrieved = DiagramOptimizer.getCachedClassification(rep1);
    expect(retrieved).toEqual(mockResult);
  });

  it("should collapse duplicate relationship edge endpoints in diagram graphs", () => {
    const graph: RelationshipGraph = {
      nodes: [
        { id: "n1", type: "circle", label: "A" },
        { id: "n2", type: "circle", label: "B" }
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2", type: "line" },
        { id: "e2", from: "n1", to: "n2", type: "arrow" } // parallel duplicate
      ],
      hierarchy: new Map(),
      containments: new Map()
    };

    const optimized = DiagramOptimizer.optimizeGraph(graph);
    expect(optimized.edges.length).toBe(1);
    expect(optimized.edges[0]?.type).toBe("arrow"); // prioritizes arrow type
  });

  it("should reuse array coordinates buffer to minimize allocation churn", () => {
    const arr = [1, 2, 3];
    const buffered = DiagramOptimizer.populateReusedBuffer(arr);
    expect(buffered.length).toBe(3);
    expect(buffered[0]).toBe(1);
  });

  it("should complete high-volume large-diagram benchmarks under CPU time limits", () => {
    // Generate 5000 shapes for high-volume benchmark
    const shapes = [];
    for (let i = 0; i < 5000; i++) {
      shapes.push({
        id: `s-${i}`,
        shapeType: "rectangle" as const,
        x: i,
        y: i * 2,
        w: 50,
        h: 50
      });
    }

    const rep = {
      shapes,
      connectors: [],
      texts: [],
      containments: []
    };

    const start = Date.now();
    const hash = DiagramOptimizer.computeHash(rep);
    const duration = Date.now() - start;

    console.log(`[Large Diagram Benchmark] Hashed 5,000 shapes in ${duration}ms`);
    expect(hash.length).toBeGreaterThan(100);
    expect(duration).toBeLessThan(100); // must execute sub-100ms
  });
});
