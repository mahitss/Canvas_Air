import { OcrPrediction, Stroke2D, SupportedLanguage } from "../types";
import { OcrClassifier } from "../classifiers/ocr";

export interface LanguagePack {
  code: string;
  name: string;
  vocabulary: string[];
  scriptRegex: RegExp;
}

/**
 * Language Manager coordinating active languages, script detections, custom language pack extensions,
 * and mixed-language stroke classification routing.
 */
export class LanguageManager {
  private packs: Map<string, LanguagePack> = new Map();
  private activeLanguageCode = "en";

  constructor() {
    // Register default English and Hindi packs
    this.registerLanguagePack({
      code: "en",
      name: "English",
      vocabulary: [
        "hello", "canvas", "project", "writing", "vision",
        "air", "paint", "hand", "gesture", "drawing", "shape",
        "math", "editor", "vector", "screen", "collaboration"
      ],
      scriptRegex: /[a-zA-Z]/
    });
    this.registerLanguagePack({
      code: "hi",
      name: "Hindi",
      vocabulary: [
        "नमस्ते", "स्वागत", "कनक", "कलम", "कमल", "जल", "घर",
        "भारत", "चित्र", "अक्षर", "भाषा", "हवा", "हाथ"
      ],
      scriptRegex: /[\u0900-\u097F]/
    });
  }

  /**
   * Registers an extensible language pack.
   */
  public registerLanguagePack(pack: LanguagePack): void {
    this.packs.set(pack.code, pack);
  }

  /**
   * Returns the code of the currently active language.
   */
  public getActiveLanguage(): string {
    return this.activeLanguageCode;
  }

  /**
   * Switches the active language code. Throws if the language is not registered.
   */
  public setActiveLanguage(code: string): void {
    if (!this.packs.has(code)) {
      throw new Error(`Language pack with code '${code}' is not registered.`);
    }
    this.activeLanguageCode = code;
  }

  /**
   * Returns a registered language pack by code.
   */
  public getLanguagePack(code: string): LanguagePack | undefined {
    return this.packs.get(code);
  }

  /**
   * Lists the codes of all registered languages.
   */
  public listLanguages(): string[] {
    return Array.from(this.packs.keys());
  }

  public detectLanguage(text: string): string {
    // Check specific script/accent packs first
    for (const [code, pack] of this.packs.entries()) {
      if (code === "en") {
        continue;
      }
      if (pack.scriptRegex.test(text)) {
        return code;
      }
    }
    // Fallback to English checking
    const enPack = this.packs.get("en");
    if (enPack && enPack.scriptRegex.test(text)) {
      return "en";
    }
    return this.activeLanguageCode;
  }

  /**
   * Classifies mixed script stroke groups by routing them to the OCR templates 
   * yielding the highest classification confidence score.
   */
  public classifyMixedLanguage(
    strokes: Stroke2D[],
    ocr: OcrClassifier,
    enabledLanguages: string[] = ["en", "hi"]
  ): OcrPrediction {
    let bestPred: OcrPrediction = {
      character: "?",
      confidence: 0.0,
      language: "en",
      recognitionTimeMs: 0,
      source: "templates"
    };

    for (const code of enabledLanguages) {
      try {
        const pred = ocr.classifyCharacter(strokes, code as SupportedLanguage);
        if (pred.confidence > bestPred.confidence) {
          bestPred = pred;
        }
      } catch (e) {
        // Safe fallback if language is unsupported in classifier
      }
    }

    return bestPred;
  }
}
