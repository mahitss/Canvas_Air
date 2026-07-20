import { describe, it, expect } from "vitest";
import { LanguageManager } from "../src/language/manager";
import { OcrClassifier } from "../src/classifiers/ocr";
import { Stroke2D } from "../src/types";

describe("Multilingual Language Manager", () => {
  const manager = new LanguageManager();
  const ocr = new OcrClassifier();

  it("should configure, switch active languages, and list registered packs", () => {
    expect(manager.getActiveLanguage()).toBe("en");
    expect(manager.listLanguages()).toContain("en");
    expect(manager.listLanguages()).toContain("hi");

    manager.setActiveLanguage("hi");
    expect(manager.getActiveLanguage()).toBe("hi");

    expect(() => manager.setActiveLanguage("es")).toThrow("not registered");
    manager.setActiveLanguage("en"); // swap back
  });

  it("should register extensible language packs with vocabularies", () => {
    manager.registerLanguagePack({
      code: "es",
      name: "Spanish",
      vocabulary: ["hola", "lienzo", "proyecto"],
      scriptRegex: /[áéíóúñÁÉÍÓÚÑ]/
    });

    expect(manager.listLanguages()).toContain("es");
    const esPack = manager.getLanguagePack("es");
    expect(esPack!.name).toBe("Spanish");
    expect(esPack!.vocabulary).toContain("lienzo");
  });

  it("should automatically detect script languages from text strings", () => {
    // English script
    expect(manager.detectLanguage("hello canvas")).toBe("en");

    // Hindi script
    expect(manager.detectLanguage("कलम कमल")).toBe("hi");

    // Spanish script
    expect(manager.detectLanguage("hola señor")).toBe("es");
  });

  it("should route mixed language script classification based on templates confidence matches", () => {
    // Draw English 'A' shape
    const strokeA: Stroke2D = [
      { x: -50, y: 100 },
      { x: 0, y: -100 },
      { x: 50, y: 100 }
    ];

    // Draw Hindi 'क' shape
    const strokeKa: Stroke2D = [
      { x: -80, y: -80 }, { x: 80, y: -80 },
      { x: 0, y: -80 }, { x: 0, y: 80 },
      { x: -40, y: 0 }, { x: 0, y: -40 }, { x: 40, y: 0 }, { x: 0, y: 40 }, { x: -40, y: 0 }
    ];

    // Route 'A' stroke group -> should predict 'A' with 'en' language code
    const predA = manager.classifyMixedLanguage([strokeA], ocr, ["en", "hi"]);
    expect(predA.character).toBe("A");
    expect(predA.language).toBe("en");
    expect(predA.confidence).toBeGreaterThan(0.85);

    // Route 'क' stroke group -> should predict 'क' with 'hi' language code
    const predKa = manager.classifyMixedLanguage([strokeKa], ocr, ["en", "hi"]);
    expect(predKa.character).toBe("क");
    expect(predKa.language).toBe("hi");
    expect(predKa.confidence).toBeGreaterThan(0.8);
  });
});
