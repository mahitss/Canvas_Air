import { QualityScorecard, ReleaseReadinessReport } from "../types";
import { DEFAULT_QA_CONFIG } from "../config";

export class ReleaseValidator {
  /**
   * Assesses quality scorecards against target limits to approve build releases.
   */
  public verifyRelease(
    scorecard: QualityScorecard,
    requirements: typeof DEFAULT_QA_CONFIG = DEFAULT_QA_CONFIG
  ): ReleaseReadinessReport {
    const failures: string[] = [];

    if (scorecard.accessibilityScore < requirements.minAccessibilityScore) {
      failures.push(
        `Accessibility check failed: Score ${scorecard.accessibilityScore} is below required threshold ${requirements.minAccessibilityScore}.`
      );
    }

    if (scorecard.aiAccuracyScore < requirements.minAiAccuracyScore) {
      failures.push(
        `AI Accuracy check failed: Score ${scorecard.aiAccuracyScore} is below required threshold ${requirements.minAiAccuracyScore}.`
      );
    }

    if (scorecard.testPassRate < requirements.minTestPassRate) {
      failures.push(
        `Test Pass Rate failed: Pass rate ${scorecard.testPassRate * 100}% is below required ${requirements.minTestPassRate * 100}%.`
      );
    }

    if (scorecard.performanceScore < requirements.minPerformanceScore) {
      failures.push(
        `Performance check failed: Score ${scorecard.performanceScore} is below required threshold ${requirements.minPerformanceScore}.`
      );
    }

    return {
      ready: failures.length === 0,
      failures,
      scorecard
    };
  }
}
