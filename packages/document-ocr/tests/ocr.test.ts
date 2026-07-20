import { describe, it, expect, beforeEach } from "vitest";
import { DocumentOCREngine } from "../src/ocr/engine";
import { OCRProvider, OCRResult, TextRegion } from "../src/types";

class MockOCRProvider implements OCRProvider {
  public id = "mock-ocr-provider";
  public name = "Mock OCR Provider";

  public async extractText(imageUri: string): Promise<OCRResult> {
    void imageUri;
    const regions: TextRegion[] = [
      { x: 10, y: 20, w: 200, h: 40, text: "Annual Financial Report", confidence: 0.95 },
      { x: 10, y: 150, w: 300, h: 25, text: "Summary of performance details.", confidence: 0.90 },
      { x: 10, y: 190, w: 300, h: 25, text: "Email contact: finance@visioncanvas.ai", confidence: 0.92 }
    ];
    return {
      text: "Annual Financial Report\nSummary of performance details.\nEmail contact: finance@visioncanvas.ai",
      confidence: 0.92,
      regions,
      segments: []
    };
  }
}

describe("Document Intelligence & OCR Platform", () => {
  let engine: DocumentOCREngine;

  beforeEach(() => {
    engine = new DocumentOCREngine();
    engine.registerProvider(new MockOCRProvider());
  });

  it("should extract character blocks and segment documents into layouts", async () => {
    const result = await engine.recognizeDocument("mock-invoice.png");
    expect(result.confidence).toBe(0.92);
    expect(result.segments.length).toBe(2);

    const heading = result.segments.find(s => s.type === "heading");
    expect(heading?.content).toBe("Annual Financial Report");
  });

  it("should scan character streams for emails, URLs, dates and amounts", () => {
    const text = "Total amount is $250.00. Contact us at info@visioncanvas.ai before 2026-07-20.";
    const entities = engine.extractEntities(text);

    const email = entities.find(e => e.type === "email");
    const amount = entities.find(e => e.type === "amount");
    const date = entities.find(e => e.type === "date");

    expect(email?.value).toBe("info@visioncanvas.ai");
    expect(amount?.value).toBe("$250.00");
    expect(date?.value).toBe("2026-07-20");
  });

  it("should align adjacent coordinate table cells into structured matrix keys", () => {
    const regions: TextRegion[] = [
      { x: 10, y: 10, w: 50, h: 20, text: "Header Col 1", confidence: 0.9 },
      { x: 100, y: 10, w: 50, h: 20, text: "Header Col 2", confidence: 0.9 },
      { x: 10, y: 50, w: 50, h: 20, text: "Row 1 Val 1", confidence: 0.9 },
      { x: 100, y: 50, w: 50, h: 20, text: "Row 1 Val 2", confidence: 0.9 }
    ];

    const tables = engine.extractTables(regions);
    expect(tables.length).toBe(1);

    const table = tables[0];
    expect(table.rows).toBe(2);
    expect(table.cols).toBe(2);

    const cell00 = table.cells.find(c => c.r === 0 && c.c === 0);
    const cell11 = table.cells.find(c => c.r === 1 && c.c === 1);

    expect(cell00?.text).toBe("Header Col 1");
    expect(cell11?.text).toBe("Row 1 Val 2");
  });

  it("should pair form labels ending in colon with horizontal values", () => {
    const regions: TextRegion[] = [
      { x: 10, y: 10, w: 80, h: 20, text: "First Name:", confidence: 0.9 },
      { x: 100, y: 10, w: 80, h: 20, text: "Alice", confidence: 0.9 }
    ];

    const fields = engine.extractFormFields(regions);
    expect(fields.length).toBe(1);
    expect(fields[0].label).toBe("First Name");
    expect(fields[0].value).toBe("Alice");
  });
});
