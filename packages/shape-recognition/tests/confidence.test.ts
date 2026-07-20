import { describe, it, expect } from "vitest";
import { ConfidenceService } from "../src/confidence/service";
import { Point2D, ShapePrediction } from "../src/types";

describe("ConfidenceService Metrics", () => {
  const service = new ConfidenceService();

  it("should evaluate high confidence and quality for a smooth, closed circle", () => {
    // Generate clean circle coordinates
    const points: Point2D[] = [];
    for (let i = 0; i <= 36; i++) {
      const angle = (i * Math.PI * 2) / 36;
      points.push({ x: 100 + Math.cos(angle) * 50, y: 100 + Math.sin(angle) * 50 });
    }

    const prediction: ShapePrediction = {
      shapeType: "circle",
      confidence: 0.95,
      boundingBox: { x: 50, y: 50, width: 100, height: 100 },
      corners: [],
      vectorData: null,
      recognitionTimeMs: 1.0,
      recognitionSource: "rules"
    };

    const metrics = service.evaluate(points, prediction);
    expect(metrics.confidence).toBeGreaterThan(0.85);
    expect(metrics.qualityScore).toBeGreaterThan(0.88);
    expect(metrics.ambiguityLevel).toBeLessThan(0.18);
  });

  it("should penalize qualityScore if the stroke has high curvature jitter", () => {
    // A circle with jagged edges/jitter added
    const points: Point2D[] = [];
    for (let i = 0; i <= 36; i++) {
      const angle = (i * Math.PI * 2) / 36;
      // Add jitter offset alternating between outer and inner
      const jitter = i % 2 === 0 ? 5 : -5;
      points.push({ x: 100 + Math.cos(angle) * (50 + jitter), y: 100 + Math.sin(angle) * (50 + jitter) });
    }

    const prediction: ShapePrediction = {
      shapeType: "circle",
      confidence: 0.75,
      boundingBox: { x: 45, y: 45, width: 110, height: 110 },
      corners: [],
      vectorData: null,
      recognitionTimeMs: 1.0,
      recognitionSource: "dollar"
    };

    const metrics = service.evaluate(points, prediction);
    // Quality should be noticeably lower than clean circle
    expect(metrics.qualityScore).toBeLessThan(0.80);
    expect(metrics.ambiguityLevel).toBeGreaterThan(0.20);
  });

  it("should penalize completeness score if closed shape endpoints are far apart", () => {
    // Circle path with a large gap at the end (only draws 3/4 of circle)
    const points: Point2D[] = [];
    for (let i = 0; i <= 27; i++) {
      const angle = (i * Math.PI * 2) / 36;
      points.push({ x: 100 + Math.cos(angle) * 50, y: 100 + Math.sin(angle) * 50 });
    }

    const prediction: ShapePrediction = {
      shapeType: "circle",
      confidence: 0.70,
      boundingBox: { x: 50, y: 50, width: 100, height: 100 },
      corners: [],
      vectorData: null,
      recognitionTimeMs: 1.0,
      recognitionSource: "dollar"
    };

    const metrics = service.evaluate(points, prediction);
    // Completeness penalty propagates to both confidence and qualityScore
    expect(metrics.qualityScore).toBeLessThan(0.70);
    expect(metrics.confidence).toBeLessThan(0.75);
  });

  it("should scale confidence based on historical stability", () => {
    const points: Point2D[] = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 }
    ];

    const prediction: ShapePrediction = {
      shapeType: "line",
      confidence: 0.95,
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      corners: [],
      vectorData: null,
      recognitionTimeMs: 1.0,
      recognitionSource: "rules"
    };

    // Stable history (all matches)
    const stableHistory = [
      { ...prediction },
      { ...prediction }
    ];
    const stableMetrics = service.evaluate(points, prediction, stableHistory);

    // Unstable history (different shape types in log)
    const unstableHistory = [
      { ...prediction, shapeType: "circle" as const },
      { ...prediction, shapeType: "square" as const }
    ];
    const unstableMetrics = service.evaluate(points, prediction, unstableHistory);

    // Stable history metrics should score higher confidence than unstable history metrics
    expect(stableMetrics.confidence).toBeGreaterThan(unstableMetrics.confidence);
  });
});
