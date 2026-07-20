export interface Point2D {
  x: number;
  y: number;
  t?: number;
}

export type Stroke2D = Point2D[];

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CharacterFeatureSet {
  boundingBox: BoundingBox;
  aspectRatio: number;
  strokeCount: number;
  loopsCount: number;
  hasCrossings: boolean;
}

export interface OcrPrediction {
  character: string;
  confidence: number;
  language: string;
  recognitionTimeMs: number;
  source: "templates" | "rules" | "ml";
}

export interface RecognitionResult {
  text: string;
  confidence: number;
  words: {
    text: string;
    confidence: number;
    characters: OcrPrediction[];
  }[];
  recognitionTimeMs: number;
}

export type SupportedLanguage = "en" | "hi";

export interface SymbolPrediction {
  symbolName: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface MathExpressionPrediction {
  latex: string;
  confidence: number;
  rawExpression: string;
}

export interface SegmentedCharacter {
  strokes: Stroke2D[];
  boundingBox: BoundingBox;
}

export interface SegmentedWord {
  characters: SegmentedCharacter[];
  boundingBox: BoundingBox;
}

export interface SegmentedLine {
  words: SegmentedWord[];
  boundingBox: BoundingBox;
}

export interface SegmentedParagraph {
  lines: SegmentedLine[];
  boundingBox: BoundingBox;
}

export interface DetailedSegmentationResult {
  paragraphs: SegmentedParagraph[];
}


