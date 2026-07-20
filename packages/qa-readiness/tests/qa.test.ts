import { describe, it, expect, beforeEach } from "vitest";
import { AccessibilityEngine } from "../src/accessibility/engine";
import { AIEvaluationEngine } from "../src/ai/evaluator";
import { ReleaseValidator } from "../src/release/validator";
import { QualityDashboardBackend } from "../src/dashboard/backend";
import { DOMNodeInfo, QualityScorecard } from "../src/types";

describe("Enterprise QA, Accessibility & Release Readiness Platform", () => {
  let accessibilityEngine: AccessibilityEngine;
  let aiEvaluator: AIEvaluationEngine;
  let releaseValidator: ReleaseValidator;
  let dashboardBackend: QualityDashboardBackend;

  beforeEach(() => {
    accessibilityEngine = new AccessibilityEngine();
    aiEvaluator = new AIEvaluationEngine();
    releaseValidator = new ReleaseValidator();
    dashboardBackend = new QualityDashboardBackend();
  });

  it("should audit UI components mapping focus tags and aria-labels checks", () => {
    const validNodes: DOMNodeInfo[] = [
      { tagName: "button", ariaLabel: "Submit Form Data", tabIndex: 0 },
      { tagName: "img", ariaLabel: "Project Diagram Outline" }
    ];

    const result1 = accessibilityEngine.runAccessibilityAudit(validNodes);
    expect(result1.success).toBe(true);
    expect(result1.errors.length).toBe(0);

    const invalidNodes: DOMNodeInfo[] = [
      { tagName: "button", tabIndex: -1 } // Missing label and bad tabIndex
    ];

    const result2 = accessibilityEngine.runAccessibilityAudit(invalidNodes);
    expect(result2.success).toBe(false);
    expect(result2.errors.length).toBe(2);
  });

  it("should calculate AI model classification precision, recall, and f1Score metrics", () => {
    // 80 true positives, 10 false positives, 10 false negatives
    const metrics = aiEvaluator.evaluateAI(80, 10, 10);
    
    // Precision = 80 / (80 + 10) = 80/90 = 0.8888...
    expect(metrics.precision).toBeCloseTo(0.8888, 3);
    
    // Recall = 80 / (80 + 10) = 80/90 = 0.8888...
    expect(metrics.recall).toBeCloseTo(0.8888, 3);
    
    // F1 Score = 2 * (0.888 * 0.888) / (0.888 + 0.888) = 0.8888...
    expect(metrics.f1Score).toBeCloseTo(0.8888, 3);
  });

  it("should enforce release gate requirements checking quality scores limits", () => {
    const perfectScorecard: QualityScorecard = {
      accessibilityScore: 98,
      aiAccuracyScore: 0.95,
      performanceScore: 90,
      testPassRate: 1.0
    };

    const report1 = releaseValidator.verifyRelease(perfectScorecard);
    expect(report1.ready).toBe(true);
    expect(report1.failures.length).toBe(0);

    const failingScorecard: QualityScorecard = {
      accessibilityScore: 85, // Below min threshold 90
      aiAccuracyScore: 0.80,  // Below min threshold 0.85
      performanceScore: 80,  // Below min threshold 85
      testPassRate: 0.99      // Below min threshold 1.0 (100%)
    };

    const report2 = releaseValidator.verifyRelease(failingScorecard);
    expect(report2.ready).toBe(false);
    expect(report2.failures.length).toBe(4);
  });

  it("should generate coverage percentage metrics and compile scorecard reports text block", () => {
    const coverage = dashboardBackend.generateCoverage(85, 100);
    expect(coverage).toBe(85.0);

    const scorecard: QualityScorecard = {
      accessibilityScore: 95,
      aiAccuracyScore: 0.90,
      performanceScore: 88,
      testPassRate: 1.0
    };
    const reportResult = releaseValidator.verifyRelease(scorecard);
    const reportText = dashboardBackend.generateReleaseReport(scorecard, reportResult);

    expect(reportText).toContain("RELEASE READINESS REPORT: APPROVED");
    expect(reportText).toContain("Accessibility Score: 95/100");
    expect(reportText).toContain("AI Accuracy: 90%");
  });
});
