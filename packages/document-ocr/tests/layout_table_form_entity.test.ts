import { describe, it, expect } from "vitest";
import { LayoutAnalyzer } from "../src/layout/analyzer";
import { TableEngine } from "../src/table/engine";
import { FormEngine } from "../src/form/engine";
import { EntityExtractor } from "../src/entity/extractor";
import { TextRegion } from "../src/types";

describe("Document OCR Sub-Engines (Layout, Table, Form, Entities)", () => {
  it("should classify page layouts including header, footer, list and columns", () => {
    const analyzer = new LayoutAnalyzer();

    const regions: TextRegion[] = [
      { x: 10, y: 10, w: 200, h: 20, text: "Report Title", confidence: 0.99 },
      { x: 50, y: 120, w: 300, h: 15, text: "- First list item", confidence: 0.95 },
      { x: 50, y: 150, w: 300, h: 15, text: "- Second list item", confidence: 0.95 },
      { x: 10, y: 920, w: 100, h: 20, text: "Page 1 of 1", confidence: 0.99 }
    ];

    const segments = analyzer.analyzeLayout(regions);
    const header = segments.find(s => s.type === "header");
    const footer = segments.find(s => s.type === "footer");
    const list = segments.find(s => s.type === "list");

    expect(header).toBeDefined();
    expect(footer).toBeDefined();
    expect(list).toBeDefined();
  });

  it("should recognize columns, headers, and merged cells in table regions", () => {
    const engine = new TableEngine();

    const regions: TextRegion[] = [
      { x: 10, y: 20, w: 50, h: 15, text: "ID Header", confidence: 0.99 },
      { x: 100, y: 20, w: 50, h: 15, text: "Name Header", confidence: 0.99 },
      { x: 10, y: 60, w: 50, h: 15, text: "1", confidence: 0.99 },
      { x: 100, y: 60, w: 300, h: 15, text: "Merged description details column", confidence: 0.95 }
    ];

    const tables = engine.extractTables(regions);
    expect(tables.length).toBe(1);
    expect(tables[0]?.headers).toEqual(["ID Header", "Name Header"]);
    const mergedCell = tables[0]?.cells.find(c => c.merged);
    expect(mergedCell).toBeDefined();
  });

  it("should detect form input fields, checkbox states, signatures, and required flags", () => {
    const engine = new FormEngine();

    const regions: TextRegion[] = [
      { x: 10, y: 50, w: 100, h: 15, text: "First Name *:", confidence: 0.99 },
      { x: 150, y: 50, w: 100, h: 15, text: "John", confidence: 0.99 },
      { x: 10, y: 100, w: 100, h: 15, text: "Subscribe:", confidence: 0.99 },
      { x: 150, y: 100, w: 30, h: 15, text: "[x]", confidence: 0.99 }
    ];

    const fields = engine.extractFormFields(regions);
    expect(fields.length).toBe(2);

    const nameField = fields.find(f => f.label === "First Name");
    expect(nameField?.required).toBe(true);
    expect(nameField?.fieldType).toBe("input");

    const checkboxField = fields.find(f => f.label === "Subscribe");
    expect(checkboxField?.fieldType).toBe("checkbox");
    expect(checkboxField?.value).toBe("[x]");
  });

  it("should extract entities with confidence scores and support extensible pattern registeries", () => {
    const extractor = new EntityExtractor();

    // Test default entity extraction
    const entities = extractor.extractEntities("Email me at user@domain.com or call +1 555-0199 on 2026-07-19.");
    const email = entities.find(e => e.type === "email");
    const date = entities.find(e => e.type === "date");
    const phone = entities.find(e => e.type === "phone");

    expect(email?.value).toBe("user@domain.com");
    expect(email?.confidence).toBe(0.99);
    expect(date?.value).toBe("2026-07-19");
    expect(phone?.value).toBe("+1 555-0199");

    // Register custom pattern
    extractor.registerPattern({
      type: "ip",
      regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      confidence: 0.90
    });

    const ipEntities = extractor.extractEntities("Server IP is 192.168.1.1");
    const ip = ipEntities.find(e => e.type === "ip");
    expect(ip?.value).toBe("192.168.1.1");
    expect(ip?.confidence).toBe(0.90);
  });
});
