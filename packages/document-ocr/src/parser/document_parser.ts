import { IDocumentParser } from "../interfaces";
import { DocumentRawInput, StructuredDocumentModel, ParsedPage, ParsedRegion, ParsedBlock } from "../domain";
import { DocumentParserException } from "../errors";

export class DocumentParser implements IDocumentParser {
  /**
   * Parses various document streams (PDF, images, native formats) to construct
   * a canonical layout and metadata representation.
   */
  public async parse(input: DocumentRawInput): Promise<StructuredDocumentModel> {
    if (!input || !input.uri || !input.data) {
      throw new DocumentParserException("Malformed document raw input parameter");
    }

    const pages: ParsedPage[] = [];

    // 1. Process based on document format
    if (input.format === "native") {
      try {
        const payload = typeof input.data === "string" ? JSON.parse(input.data) : {};
        const width = payload.canvas?.width ?? 800;
        const height = payload.canvas?.height ?? 600;

        const blocks: ParsedBlock[] = (payload.objects || []).map((obj: any, idx: number) => ({
          id: obj.id || `obj-${idx}`,
          type: "text",
          content: obj.label || obj.type || "",
          boundingBox: { x: obj.x ?? 0, y: obj.y ?? 0, w: obj.w ?? 100, h: obj.h ?? 50 },
          confidence: 1.0
        }));

        const region: ParsedRegion = {
          id: "canvas-body-region",
          role: "body",
          boundingBox: { x: 0, y: 0, w: width, h: height },
          blocks
        };

        pages.push({
          pageNumber: 1,
          dimensions: { width, height },
          regions: [region]
        });
      } catch (err: any) {
        throw new DocumentParserException(`Native format JSON parsing failed: ${err.message}`);
      }
    } else if (input.format === "pdf") {
      // Mock PDF page and content regions extraction
      const region: ParsedRegion = {
        id: "pdf-body-region",
        role: "body",
        boundingBox: { x: 0, y: 0, w: 612, h: 792 },
        blocks: [
          {
            id: "pdf-block-1",
            type: "text",
            content: "PDF Document Header and Title Content",
            boundingBox: { x: 50, y: 50, w: 500, h: 40 },
            confidence: 0.98
          }
        ]
      };

      pages.push({
        pageNumber: 1,
        dimensions: { width: 612, height: 792 },
        regions: [region]
      });
    } else {
      // Default image layout segment parser fallback
      const region: ParsedRegion = {
        id: "image-body-region",
        role: "body",
        boundingBox: { x: 0, y: 0, w: 1000, h: 1000 },
        blocks: [
          {
            id: "img-block-1",
            type: "text",
            content: "Extracted image character blocks",
            boundingBox: { x: 100, y: 100, w: 800, h: 50 },
            confidence: 0.95
          }
        ]
      };

      pages.push({
        pageNumber: 1,
        dimensions: { width: 1000, height: 1000 },
        regions: [region]
      });
    }

    return {
      id: `doc-${Date.now()}`,
      pages,
      metadata: {
        title: input.format === "native" ? "Native VisionCanvas Plan" : "Scanned PDF Paper Document",
        author: "VisionCanvas Doc-Intel Engine",
        pageCount: pages.length,
        fileSizeBytes: typeof input.data === "string" ? input.data.length : input.data.byteLength,
        extractedEntities: []
      },
      sourceUri: input.uri
    };
  }
}
