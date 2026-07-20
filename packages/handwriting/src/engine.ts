import { Stroke2D, RecognitionResult } from "./types";
import { OcrClassifier } from "./classifiers/ocr";
import { LanguageModel } from "./language/model";
import { TextBufferEditor } from "./editor/buffer";
import { HandwritingEngineConfig, DEFAULT_HANDWRITING_CONFIG } from "./config";

/**
 * Coordinates layout segmentations, classifications, and text buffer edits.
 * Optimized with prediction caching, adaptive point downsampling, and parallel batch operations.
 */
export class HandwritingRecognitionEngine {
  private config: HandwritingEngineConfig;
  private ocr: OcrClassifier;
  private languageModel: LanguageModel;
  private editor: TextBufferEditor;
  private predictionCache: Map<string, RecognitionResult> = new Map();

  constructor(config: HandwritingEngineConfig = DEFAULT_HANDWRITING_CONFIG) {
    this.config = config;
    this.ocr = new OcrClassifier();
    this.languageModel = new LanguageModel();
    this.editor = new TextBufferEditor();
  }

  public setConfig(config: HandwritingEngineConfig): void {
    this.config = config;
  }

  public getEditor(): TextBufferEditor {
    return this.editor;
  }

  public getLanguageModel(): LanguageModel {
    return this.languageModel;
  }

  /**
   * Clears the internal stroke coordinates cache.
   */
  public clearCache(): void {
    this.predictionCache.clear();
  }

  /**
   * Processes batch recognition of multiple stroke groups concurrently in parallel.
   */
  public async recognizeBatch(strokeGroups: Stroke2D[][]): Promise<RecognitionResult[]> {
    return Promise.all(strokeGroups.map(group => Promise.resolve(this.recognizeContinuous(group))));
  }

  /**
   * Processes handwritten drawing strokes list, translates characters, applies 
   * Levenshtein spell checks, and commits final strings to the editor buffer.
   * Utilizes prediction caching and adaptive point simplification.
   */
  public recognizeContinuous(strokes: Stroke2D[]): RecognitionResult {
    const startTime = performance.now();

    if (strokes.length === 0) {
      return {
        text: this.editor.getText(),
        confidence: 0.0,
        words: [],
        recognitionTimeMs: performance.now() - startTime
      };
    }

    // 1. Check prediction cache by computing stroke coordinates fingerprint
    const fingerprint = this.getStrokesFingerprint(strokes);
    const cached = this.predictionCache.get(fingerprint);
    if (cached) {
      return {
        ...cached,
        recognitionTimeMs: performance.now() - startTime
      };
    }

    // 2. Adaptive point simplification: downsample strokes containing heavy coordinates count
    const processedStrokes = strokes.map(stroke => {
      if (stroke.length > 50) {
        return this.simplifyStroke(stroke, 2.5);
      }
      return stroke;
    });

    // 3. Evaluate OCR character prediction
    const prediction = this.ocr.classifyCharacter(processedStrokes, this.config.defaultLanguage);
    
    let matchedChar = prediction.character;
    let confidence = prediction.confidence;

    // 4. Perform spell check corrections if confidence is above threshold
    if (confidence >= this.config.confidenceThreshold && matchedChar !== "?") {
      this.editor.insert(matchedChar);

      const wordsList = this.editor.getText().split(/\s+/);
      const lastWord = wordsList[wordsList.length - 1];

      if (lastWord && this.config.autoCorrectWords) {
        const corrected = this.languageModel.spellCheck(lastWord, this.config.defaultLanguage);
        if (corrected !== lastWord) {
          // Replace last word inside buffer editor
          const diffLen = lastWord.length;
          for (let i = 0; i < diffLen; i++) {
            this.editor.deleteBackward();
          }
          this.editor.insert(corrected);
        }
      }
    }

    const duration = performance.now() - startTime;

    const result: RecognitionResult = {
      text: this.editor.getText(),
      confidence,
      words: [
        {
          text: this.editor.getText(),
          confidence,
          characters: [prediction]
        }
      ],
      recognitionTimeMs: duration
    };

    // Cache the finalized prediction result
    this.predictionCache.set(fingerprint, result);

    return result;
  }

  private getStrokesFingerprint(strokes: Stroke2D[]): string {
    return strokes.map(stroke => {
      if (stroke.length === 0) return "empty";
      const start = stroke[0]!;
      const end = stroke[stroke.length - 1]!;
      return `${start.x.toFixed(1)},${start.y.toFixed(1)},${end.x.toFixed(1)},${end.y.toFixed(1)},${stroke.length}`;
    }).join("|");
  }

  private simplifyStroke(stroke: Stroke2D, tolerance: number): Stroke2D {
    if (stroke.length <= 2) return stroke;
    const result: Stroke2D = [stroke[0]!];
    let prev = stroke[0]!;

    for (let i = 1; i < stroke.length - 1; i++) {
      const curr = stroke[i]!;
      const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      if (dist >= tolerance) {
        result.push(curr);
        prev = curr;
      }
    }

    result.push(stroke[stroke.length - 1]!);
    return result;
  }
}
