import { describe, it, expect } from "vitest";
import { StrokeAnalyzer } from "../src/features/stroke_analyzer";
import { OcrClassifier } from "../src/classifiers/ocr";
import { LanguageModel } from "../src/language/model";
import { MathParser } from "../src/math/parser";
import { TextBufferEditor } from "../src/editor/buffer";
import { HandwritingRecognitionEngine } from "../src/engine";
import { Point2D, Stroke2D } from "../src/types";

describe("Stroke Analyzer Feature Extractions", () => {
  it("should extract aspect ratio, loop counts and crossings", () => {
    // Single loop coordinate path
    const loopStroke: Stroke2D = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
      { x: 0, y: 2 } // Returns close to start, counts as self-looping
    ];

    const features = StrokeAnalyzer.analyze([loopStroke]);
    expect(features.loopsCount).toBe(1);
    expect(features.strokeCount).toBe(1);
    expect(features.hasCrossings).toBe(false);
  });
});

describe("OCR Character Classifications", () => {
  it("should match templates for English alphabet inputs", () => {
    const ocr = new OcrClassifier();
    
    // Draw raw 'C' shape
    const ptsC: Point2D[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = Math.PI * 0.5 + (i * Math.PI * 1.0) / 19;
      ptsC.push({ x: Math.cos(angle) * 80, y: Math.sin(angle) * 80 });
    }

    const prediction = ocr.classifyCharacter([ptsC], "en");
    expect(prediction.character).toBe("C");
    expect(prediction.confidence).toBeGreaterThan(0.7);
  });
});

describe("Language Dictionary & Levenshtein Spell Checks", () => {
  it("should suggest corrections based on edit distances", () => {
    const model = new LanguageModel();

    // Word "cavas" has distance 1 from "canvas"
    const correctedEn = model.spellCheck("cavas", "en");
    expect(correctedEn).toBe("canvas");

    // Hindi word "कमल"
    const correctedHi = model.spellCheck("कमल", "hi");
    expect(correctedHi).toBe("कमल");
  });

  it("should return autocomplete suggestions", () => {
    const model = new LanguageModel();
    const suggestions = model.getPredictions("proj", "en");
    expect(suggestions).toContain("project");
  });
});

describe("LaTeX Math Equations Parser", () => {
  it("should map numerator/denominator positions to fraction expressions", () => {
    // Draw symbols for fraction:
    // '1' (above fraction bar)
    // '-' (fraction bar)
    // '2' (below fraction bar)
    const symbols = [
      { char: "1", boundingBox: { x: 10, y: 10, width: 10, height: 20 } },
      { char: "-", boundingBox: { x: 5, y: 40, width: 30, height: 5 } }, // main bar
      { char: "2", boundingBox: { x: 12, y: 55, width: 12, height: 22 } }
    ];

    const latex = MathParser.parseSymbolsToLatex(symbols);
    expect(latex).toBe("\\frac{1}{2}");
  });
});

describe("Text Buffer Undo/Redo Histories", () => {
  it("should execute and reverse insert/delete actions", () => {
    const editor = new TextBufferEditor();

    editor.insert("hello");
    expect(editor.getText()).toBe("hello");

    editor.deleteBackward();
    expect(editor.getText()).toBe("hell");

    editor.undo(); // Undo deletion -> restores "hello"
    expect(editor.getText()).toBe("hello");

    editor.undo(); // Undo insertion -> restores empty string ""
    expect(editor.getText()).toBe("");
  });
});
