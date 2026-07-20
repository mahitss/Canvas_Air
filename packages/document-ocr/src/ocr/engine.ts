import { OCRProvider, OCRResult, DocumentEntity, TableStructure, FormField, TextRegion } from "../types";
import { LayoutAnalyzer } from "../layout/analyzer";
import { EntityExtractor } from "../entity/extractor";
import { TableEngine } from "../table/engine";
import { FormEngine } from "../form/engine";

export class DocumentOCREngine {
  private providers: Map<string, OCRProvider> = new Map();
  private defaultProviderId: string | null = null;
  private analyzer: LayoutAnalyzer;
  private extractor: EntityExtractor;
  private tableEngine: TableEngine;
  private formEngine: FormEngine;

  constructor() {
    this.analyzer = new LayoutAnalyzer();
    this.extractor = new EntityExtractor();
    this.tableEngine = new TableEngine();
    this.formEngine = new FormEngine();
  }

  public registerProvider(provider: OCRProvider): void {
    this.providers.set(provider.id, provider);
    if (!this.defaultProviderId) {
      this.defaultProviderId = provider.id;
    }
  }

  public selectProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Cannot select unregistered OCR provider: ${id}`);
    }
    this.defaultProviderId = id;
  }

  /**
   * Routes extraction using selected OCRProvider, then appends layout segments.
   */
  public async recognizeDocument(imageUri: string): Promise<OCRResult> {
    if (!this.defaultProviderId) {
      throw new Error("No OCR providers registered inside DocumentOCREngine.");
    }
    const provider = this.providers.get(this.defaultProviderId)!;

    // 1. Fetch initial character blocks
    const baseResult = await provider.extractText(imageUri);

    // 2. Supplement layout analyses
    const segments = this.analyzer.analyzeLayout(baseResult.regions);

    return {
      ...baseResult,
      segments
    };
  }

  public extractEntities(text: string): DocumentEntity[] {
    return this.extractor.extractEntities(text);
  }

  public extractTables(regions: TextRegion[]): TableStructure[] {
    return this.tableEngine.extractTables(regions);
  }

  public extractFormFields(regions: TextRegion[]): FormField[] {
    return this.formEngine.extractFormFields(regions);
  }

  /**
   * Exports OCR result structures to markdown, JSON or plain text.
   */
  public exportStructuredData(result: OCRResult, format: "text" | "markdown" | "json"): string {
    if (format === "json") {
      return JSON.stringify(result, null, 2);
    }

    if (format === "markdown") {
      const lines: string[] = [];
      for (const seg of result.segments) {
        if (seg.type === "heading") {
          lines.push(`# ${seg.content}\n`);
        } else {
          lines.push(`${seg.content}\n`);
        }
      }
      return lines.join("\n").trim();
    }

    return result.text;
  }
}
