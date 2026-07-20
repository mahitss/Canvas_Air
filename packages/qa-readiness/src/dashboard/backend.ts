import { QualityScorecard, ReleaseReadinessReport } from "../types";

export class QualityDashboardBackend {
  public generateCoverage(coveredLines: number, totalLines: number): number {
    if (totalLines <= 0) return 0;
    return parseFloat(((coveredLines / totalLines) * 100).toFixed(2));
  }

  /**
   * Generates formatted release quality status text records.
   */
  public generateReleaseReport(
    scorecard: QualityScorecard,
    report: ReleaseReadinessReport
  ): string {
    const status = report.ready ? "APPROVED" : "BLOCKED";
    let reportStr = `RELEASE READINESS REPORT: ${status}\n`;
    reportStr += `Accessibility Score: ${scorecard.accessibilityScore}/100\n`;
    reportStr += `AI Accuracy: ${scorecard.aiAccuracyScore * 100}%\n`;
    reportStr += `Performance Index: ${scorecard.performanceScore}\n`;
    reportStr += `Test Pass Rate: ${scorecard.testPassRate * 100}%\n`;

    if (report.failures.length > 0) {
      reportStr += `\nFAILURES DETECTED:\n`;
      for (const fail of report.failures) {
        reportStr += `- ${fail}\n`;
      }
    }

    return reportStr;
  }
}
export * from "../types";
export * from "../config";
export * from "../accessibility/engine";
export * from "../ai/evaluator";
export * from "../release/validator";
export * from "../dashboard/backend";
