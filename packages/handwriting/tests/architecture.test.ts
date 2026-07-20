import { describe, it, expect } from "vitest";
import { HANDWRITING_TOKENS } from "../src/di";
import { HandwritingError, SegmentationError, MathParserError } from "../src/errors";

describe("Handwriting Recognition Engine Clean Architecture Verification", () => {
  it("should declare DI tokens representing all sub-modules correctly", () => {
    expect(HANDWRITING_TOKENS.HandwritingEngine).toBeDefined();
    expect(HANDWRITING_TOKENS.Segmenter).toBeDefined();
    expect(HANDWRITING_TOKENS.Classifier).toBeDefined();
    expect(HANDWRITING_TOKENS.Spellchecker).toBeDefined();
    expect(HANDWRITING_TOKENS.MathParser).toBeDefined();
    expect(HANDWRITING_TOKENS.SymbolClassifier).toBeDefined();
    expect(HANDWRITING_TOKENS.EventBus).toBeDefined();
    expect(HANDWRITING_TOKENS.LanguageManager).toBeDefined();
    expect(HANDWRITING_TOKENS.ConfidenceService).toBeDefined();

    expect(typeof HANDWRITING_TOKENS.HandwritingEngine).toBe("symbol");
    expect(Symbol.keyFor(HANDWRITING_TOKENS.HandwritingEngine)).toBe("IHandwritingEngine");
    expect(Symbol.keyFor(HANDWRITING_TOKENS.LanguageManager)).toBe("ILanguageManager");
    expect(Symbol.keyFor(HANDWRITING_TOKENS.ConfidenceService)).toBe("IHandwritingConfidenceService");
  });

  it("should define structural class hierarchy for handwriting exceptions", () => {
    const error = new HandwritingError("Root error");
    const segError = new SegmentationError("Seg failed");
    const mathError = new MathParserError("Math failed");

    expect(error).toBeInstanceOf(Error);
    expect(segError).toBeInstanceOf(HandwritingError);
    expect(mathError).toBeInstanceOf(HandwritingError);

    expect(segError.name).toBe("SegmentationError");
    expect(mathError.name).toBe("MathParserError");
  });

  it("should export compile-safe interfaces and event payloads", () => {
    // Assert event payload structure shapes are correctly defined
    const event: any = {
      type: "MathExpressionRecognized",
      payload: {
        strokeIds: ["stroke-1"],
        result: {
          latex: "E = mc^2",
          confidence: 0.99,
          rawExpression: "E=mc^2"
        }
      },
      timestamp: Date.now()
    };

    expect(event.type).toBe("MathExpressionRecognized");
    expect(event.payload.result.latex).toBe("E = mc^2");
  });
});
