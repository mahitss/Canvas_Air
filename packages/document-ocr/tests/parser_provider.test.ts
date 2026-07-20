import { describe, it, expect } from "vitest";
import { DocumentParser } from "../src/parser/document_parser";
import { DefaultDocumentOCRProvider } from "../src/ocr/provider_framework";

describe("Document Intelligence Parser & OCR Provider", () => {
  it("should parse native VisionCanvas and PDF document formats", async () => {
    const parser = new DocumentParser();

    // 1. Native format
    const nativeInput = {
      uri: "local://plan.json",
      format: "native" as const,
      data: JSON.stringify({
        canvas: { width: 1000, height: 800 },
        objects: [{ id: "o1", type: "text", label: "Diagram Label", x: 10, y: 10, w: 100, h: 50 }]
      })
    };

    const doc = await parser.parse(nativeInput);
    expect(doc.metadata.pageCount).toBe(1);
    expect(doc.pages[0]?.dimensions.width).toBe(1000);
    expect(doc.pages[0]?.regions[0]?.blocks.length).toBe(1);
    expect(doc.pages[0]?.regions[0]?.blocks[0]?.content).toBe("Diagram Label");

    // 2. PDF format
    const pdfInput = {
      uri: "local://invoice.pdf",
      format: "pdf" as const,
      data: new ArrayBuffer(50)
    };

    const pdfDoc = await parser.parse(pdfInput);
    expect(pdfDoc.pages[0]?.dimensions.width).toBe(612); // standard letter size
  });

  it("should initialize default provider and verify health and dispose lifecycle states", async () => {
    const provider = new DefaultDocumentOCRProvider();
    expect(await provider.health()).toBe("down");

    await provider.initialize();
    expect(await provider.health()).toBe("healthy");

    const result = await provider.recognize("local://image.png");
    expect(result.confidence).toBe(0.96);
    expect(result.regions.length).toBe(1);

    await provider.dispose();
    expect(await provider.health()).toBe("down");
  });
});
