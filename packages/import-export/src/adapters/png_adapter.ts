import { IFileAdapter } from "../interfaces";
import { VisionCanvasDoc } from "../domain";

export class PngFileAdapter implements IFileAdapter {
  public readonly supportedExtensions = ["png"];

  /**
   * Mock PNG importer: decodes injected metadata chunks from the raw data.
   */
  public async importFile(data: ArrayBuffer | string): Promise<VisionCanvasDoc> {
    const rawString = typeof data === "string" ? data : new TextDecoder().decode(data);
    
    // Extract metadata block
    const metaMatch = rawString.match(/<vcanvas-meta>(.*?)<\/vcanvas-meta>/);
    if (!metaMatch || !metaMatch[1]) {
      throw new Error("PngImportError: Custom VisionCanvas metadata block not found inside PNG payload");
    }

    return JSON.parse(metaMatch[1]);
  }

  /**
   * Mock PNG exporter: builds a PNG file header signature containing embedded JSON metadata block.
   */
  public async exportFile(doc: VisionCanvasDoc): Promise<ArrayBuffer | string> {
    const header = "\x89PNG\r\n\x1a\n";
    const metadataBlock = `<vcanvas-meta>${JSON.stringify(doc)}<\/vcanvas-meta>`;
    
    // Configurable resolution and transparent canvas bounds simulated
    const resolution = `resolution=${doc.canvas.width}x${doc.canvas.height};transparent=true;`;
    
    return header + resolution + metadataBlock;
  }
}
