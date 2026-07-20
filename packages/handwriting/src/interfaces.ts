import { Stroke2D, RecognitionResult, OcrPrediction, MathExpressionPrediction, SymbolPrediction, DetailedSegmentationResult } from "./types";
import { HandwritingBusEvent, HandwritingBusEventType } from "./events";

export interface IHandwritingEngine {
  recognize(strokes: Stroke2D[], strokeIds?: string[]): Promise<RecognitionResult>;
  recognizeMath?(strokes: Stroke2D[]): Promise<MathExpressionPrediction>;
  recognizeSymbol?(strokes: Stroke2D[]): Promise<SymbolPrediction>;
}

export interface IHandwritingSegmenter {
  segment(strokes: Stroke2D[]): Stroke2D[][];
  segmentDetailed(strokes: Stroke2D[]): DetailedSegmentationResult;
}

export interface IHandwritingClassifier {
  classify(strokeGroup: Stroke2D[]): OcrPrediction;
}

export interface IHandwritingSpellchecker {
  check(text: string): string;
}

export interface IMathExpressionParser {
  parse(ocrPredictions: OcrPrediction[]): MathExpressionPrediction;
}

export interface ISymbolClassifier {
  classifySymbol(strokeGroup: Stroke2D[]): SymbolPrediction;
}

export interface IHandwritingEventBus {
  publish(event: HandwritingBusEvent): void;
  subscribe(
    type: HandwritingBusEventType | "*",
    callback: (event: HandwritingBusEvent) => void,
    options?: { replay?: boolean }
  ): () => void;
  clearHistory(): void;
  unsubscribeAll(): void;
}

export interface HandwritingConfidenceMetrics {
  confidence: number;       // Overall combined score [0.0 - 1.0]
  qualityScore: number;     // Drawing quality metric [0.0 - 1.0]
  ambiguityLevel: number;   // Ambiguity score [0.0 - 1.0]
}

export interface IHandwritingConfidenceService {
  evaluate(
    strokes: Stroke2D[],
    characterPrediction: OcrPrediction,
    wordText?: string,
    isWordValid?: boolean
  ): HandwritingConfidenceMetrics;
}

