import { IFileAdapter } from "../interfaces";
import { VisionCanvasDoc } from "../domain";

export class PdfFileAdapter implements IFileAdapter {
  public readonly supportedExtensions = ["pdf"];

  public async importFile(data: ArrayBuffer | string): Promise<VisionCanvasDoc> {
    const rawString = typeof data === "string" ? data : new TextDecoder().decode(data);
    
    const metaMatch = rawString.match(/\/VCanvasMeta\s*\((.*?)\)/);
    if (!metaMatch || !metaMatch[1]) {
      throw new Error("PdfImportError: VCanvasMeta stream reference dictionary not found inside PDF");
    }

    return JSON.parse(metaMatch[1]);
  }

  public async exportFile(doc: VisionCanvasDoc): Promise<ArrayBuffer | string> {
    const pdfLines = [
      "%PDF-1.4",
      "1 0 obj",
      "<< /Type /Catalog /Pages 2 0 R >>",
      "endobj",
      "2 0 obj",
      `<< /Type /Pages /Count 1 /Kids [ 3 0 R ] >>`,
      "endobj",
      "3 0 obj",
      `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${doc.canvas.width} ${doc.canvas.height} ] /Contents 4 0 R >>`,
      "endobj",
      "4 0 obj",
      `<< /Length 0 >>`,
      "stream",
      // (vector drawing stream placeholder)
      "endstream",
      "endobj",
      "5 0 obj",
      `<< /Title (${doc.metadata.title}) /Author (${doc.metadata.author}) /VCanvasMeta (${JSON.stringify(doc)}) >>`,
      "endobj",
      "xref",
      "0 6",
      "trailer",
      "<< /Size 6 /Root 1 0 R /Info 5 0 R >>",
      "%%EOF"
    ];

    return pdfLines.join("\n");
  }
}
