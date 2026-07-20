import { describe, it, expect } from "vitest";
import { OcrClassifier } from "../src/classifiers/ocr";
import { Stroke2D } from "../src/types";

describe("Handwriting Character Recognition (OCR Classifier)", () => {
  const ocr = new OcrClassifier();

  it("should recognize English uppercase character A", () => {
    // Exact path matching 'A' template
    const strokeA: Stroke2D = [
      { x: -50, y: 100 },
      { x: 0, y: -100 },
      { x: 50, y: 100 }
    ];

    const prediction = ocr.classifyCharacter([strokeA], "en");
    expect(prediction.character).toBe("A");
    expect(prediction.confidence).toBeGreaterThan(0.85);
    expect(prediction.recognitionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should recognize English lowercase character c", () => {
    // Arc-like shape matching lowercase 'c' template
    const strokeC: Stroke2D = [];
    for (let i = 0; i <= 15; i++) {
      const angle = Math.PI * 0.5 + (i * Math.PI * 1.0) / 15;
      strokeC.push({ x: Math.cos(angle) * 50, y: Math.sin(angle) * 50 });
    }

    const prediction = ocr.classifyCharacter([strokeC], "en");
    expect(prediction.character).toBe("c");
    expect(prediction.confidence).toBeGreaterThan(0.85);
  });

  it("should recognize number 0 (circle)", () => {
    const strokeZero: Stroke2D = [];
    for (let i = 0; i <= 20; i++) {
      const angle = (i * Math.PI * 2.0) / 20;
      strokeZero.push({ x: Math.cos(angle) * 80, y: Math.sin(angle) * 80 });
    }

    const prediction = ocr.classifyCharacter([strokeZero], "en");
    // Standard template '0' is a circle of radius 80
    expect(prediction.character).toBe("0");
    expect(prediction.confidence).toBeGreaterThan(0.85);
  });

  it("should recognize punctuation mark - (dash/hyphen)", () => {
    const strokeDash: Stroke2D = [
      { x: -40, y: 0 },
      { x: 40, y: 0 }
    ];

    const prediction = ocr.classifyCharacter([strokeDash], "en");
    expect(prediction.character).toBe("-");
    expect(prediction.confidence).toBeGreaterThan(0.85);
  });

  it("should recognize special symbol * (asterisk-like cross)", () => {
    const strokeAsterisk: Stroke2D = [
      { x: -30, y: -30 }, { x: 30, y: 30 },
      { x: 30, y: -30 }, { x: -30, y: 30 },
      { x: 0, y: -40 }, { x: 0, y: 40 }
    ];

    const prediction = ocr.classifyCharacter([strokeAsterisk], "en");
    expect(prediction.character).toBe("*");
    expect(prediction.confidence).toBeGreaterThan(0.8);
  });
});
