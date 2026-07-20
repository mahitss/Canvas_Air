export interface DOMNodeInfo {
  tagName: string;
  tabIndex?: number;
  ariaLabel?: string;
  role?: string;
}

export interface AccessibilityAuditResult {
  success: boolean;
  errors: string[];
}

export interface AIEvaluationMetrics {
  precision: number;
  recall: number;
  f1Score: number;
}

export interface ReleaseGateConfig {
  minCoveragePercent: number;
  maxAllowedErrors: number;
}

export interface QualityScorecard {
  accessibilityScore: number;
  aiAccuracyScore: number;
  performanceScore: number;
  testPassRate: number;
}

export interface ReleaseReadinessReport {
  ready: boolean;
  failures: string[];
  scorecard: QualityScorecard;
}
