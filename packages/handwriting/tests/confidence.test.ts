import { describe, it, expect } from "vitest";
import { HandwritingConfidenceService } from "../src/confidence/service";
import { Stroke2D, OcrPrediction } from "../src/types";

describe("Handwriting Confidence Service", () => {
  const service = new HandwritingConfidenceService();

  it("should score high quality for smooth strokes and lower quality for jittery/shaky strokes", () => {
    // 1. Smooth stroke: perfectly linear spacing
    const smoothStroke: Stroke2D = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
      { x: 40, y: 40 }
    ];

    // 2. Jittery stroke: rapid sharp direction switches (sharp turns)
    const jitteryStroke: Stroke2D = [
      { x: 10, y: 10 },
      { x: 15, y: 30 }, // sharp turn
      { x: 10, y: 12 }, // sharp turn back
      { x: 25, y: 40 }
    ];

    const pred: OcrPrediction = {
      character: "A",
      confidence: 0.9,
      language: "en",
      recognitionTimeMs: 0,
      source: "templates"
    };

    const metricsSmooth = service.evaluate([smoothStroke], pred);
    const metricsJitter = service.evaluate([jitteryStroke], pred);

    expect(metricsSmooth.qualityScore).toBeGreaterThan(0.8);
    expect(metricsJitter.qualityScore).toBeLessThan(metricsSmooth.qualityScore);
  });

  it("should output appropriate ambiguity levels corresponding to prediction scores", () => {
    const highConfPred: OcrPrediction = {
      character: "A",
      confidence: 0.95,
      language: "en",
      source: "templates",
      recognitionTimeMs: 0
    };

    const lowConfPred: OcrPrediction = {
      character: "B",
      confidence: 0.35,
      language: "en",
      source: "templates",
      recognitionTimeMs: 0
    };

    const stroke: Stroke2D = [{ x: 0, y: 0 }, { x: 10, y: 10 }];

    const highMetrics = service.evaluate([stroke], highConfPred);
    const lowMetrics = service.evaluate([stroke], lowConfPred);

    expect(highMetrics.ambiguityLevel).toBeLessThan(0.1);
    expect(lowMetrics.ambiguityLevel).toBeGreaterThan(0.5);
  });

  it("should adjust combined confidence for dictionary valid words vs invalid spellings", () => {
    const pred: OcrPrediction = {
      character: "h",
      confidence: 0.9,
      language: "en",
      source: "templates",
      recognitionTimeMs: 0
    };

    const stroke: Stroke2D = [{ x: 0, y: 0 }, { x: 10, y: 10 }];

    // Valid vocabulary word
    const validWordMetrics = service.evaluate([stroke], pred, "hello", true);
    // Invalid misspelled word
    const invalidWordMetrics = service.evaluate([stroke], pred, "hlxlo", false);

    expect(validWordMetrics.confidence).toBeGreaterThan(0.85);
    expect(invalidWordMetrics.confidence).toBeLessThan(validWordMetrics.confidence);
  });
});
