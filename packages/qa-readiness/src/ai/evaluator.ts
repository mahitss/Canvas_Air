import { AIEvaluationMetrics } from "../types";

export class AIEvaluationEngine {
  /**
   * Benchmarks model performance statistics returning precision, recall and F1 accuracy rates.
   */
  public evaluateAI(
    truePositives: number,
    falsePositives: number,
    falseNegatives: number
  ): AIEvaluationMetrics {
    const precisionDenominator = truePositives + falsePositives;
    const precision = precisionDenominator > 0 ? truePositives / precisionDenominator : 0;

    const recallDenominator = truePositives + falseNegatives;
    const recall = recallDenominator > 0 ? truePositives / recallDenominator : 0;

    const f1ScoreDenominator = precision + recall;
    const f1Score = f1ScoreDenominator > 0 ? (2 * (precision * recall)) / f1ScoreDenominator : 0;

    return {
      precision,
      recall,
      f1Score
    };
  }
}
