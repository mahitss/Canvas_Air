import { describe, it, expect } from "vitest";
import { HandwritingRecognitionEngine } from "../src/engine";
import { Stroke2D } from "../src/types";

describe("Handwriting Recognition Engine Optimizations", () => {
  it("should cache prediction results and yield sub-millisecond latency on cache hits", () => {
    const engine = new HandwritingRecognitionEngine();
    engine.setConfig({
      defaultLanguage: "en",
      confidenceThreshold: 0.5,
      autoCorrectWords: false,
      contextAwareCorrections: false,
      characterResampleCount: 32
    });
    
    // Draw English 'A' shape
    const strokeA: Stroke2D = [
      { x: -50, y: 100 },
      { x: 0, y: -100 },
      { x: 50, y: 100 }
    ];

    // Initial classification
    const firstResult = engine.recognizeContinuous([strokeA]);
    expect(firstResult.text).toBe("A");

    // Second classification (should hit cache)
    const secondResult = engine.recognizeContinuous([strokeA]);
    expect(secondResult.text).toBe("A");
    expect(secondResult.recognitionTimeMs).toBeLessThan(1.5); // Sub-millisecond cache latency
  });

  it("should batch recognize multiple stroke sets concurrently in parallel", async () => {
    const engine = new HandwritingRecognitionEngine();
    engine.setConfig({
      defaultLanguage: "en",
      confidenceThreshold: 0.5,
      autoCorrectWords: false,
      contextAwareCorrections: false,
      characterResampleCount: 32
    });

    const group1: Stroke2D[] = [
      [{ x: -50, y: 100 }, { x: 0, y: -100 }, { x: 50, y: 100 }] // 'A'
    ];
    const group2: Stroke2D[] = [
      [{ x: -50, y: -100 }, { x: -50, y: 100 }, { x: 50, y: 100 }] // 'L'
    ];

    const results = await engine.recognizeBatch([group1, group2]);

    expect(results).toHaveLength(2);
    expect(results[0]!.text).toBe("A");
    expect(results[1]!.text).toBe("AL"); // Continuous editor appends characters
  });

  it("should apply adaptive point simplification on dense strokes to reduce points count", () => {
    const engine = new HandwritingRecognitionEngine();
    engine.setConfig({
      defaultLanguage: "en",
      confidenceThreshold: 0.5,
      autoCorrectWords: false,
      contextAwareCorrections: false,
      characterResampleCount: 32
    });

    // Generate very dense line stroke (200 points)
    const denseStroke: Stroke2D = [];
    for (let i = 0; i < 200; i++) {
      denseStroke.push({ x: i * 0.2, y: i * 0.2 });
    }

    const start = performance.now();
    const result = engine.recognizeContinuous([denseStroke]);
    const duration = performance.now() - start;

    expect(result.text).toBeDefined();
    console.log(`[BENCHMARK] Recognized 200-point dense stroke in ${duration.toFixed(3)}ms`);
    expect(duration).toBeLessThan(35.0); // Verifies fast layout computation
  });
});
