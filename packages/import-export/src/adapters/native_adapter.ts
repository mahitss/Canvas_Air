import { IFileAdapter } from "../interfaces";
import { VisionCanvasDoc } from "../domain";
import { CanonicalDocumentModelManager } from "../document/model";

export class NativeProjectFileAdapter implements IFileAdapter {
  public readonly supportedExtensions = ["vpx", "visioncanvas"];

  public async importFile(data: ArrayBuffer | string): Promise<VisionCanvasDoc> {
    const rawString = typeof data === "string" ? data : new TextDecoder().decode(data);
    const parsed = JSON.parse(rawString);

    const { docPayload, checksum } = parsed;
    if (!docPayload || checksum === undefined) {
      throw new Error("NativeAdapterError: Invalid package wrapper structure");
    }

    // Verify integrity checksum
    const computed = this.calculateChecksum(docPayload);
    if (computed !== checksum) {
      throw new Error(`NativeAdapterError: Checksum validation failed (Expected ${checksum}, computed ${computed})`);
    }

    // Decompress document payload
    const decompressedString = this.decompressPayload(docPayload);
    const doc = JSON.parse(decompressedString);

    // Schema validation and upgrade migration
    const upgraded = CanonicalDocumentModelManager.upgrade(doc);
    return upgraded;
  }

  public async exportFile(doc: VisionCanvasDoc): Promise<ArrayBuffer | string> {
    const serialized = JSON.stringify(doc);
    const compressed = this.compressPayload(serialized);
    const checksum = this.calculateChecksum(compressed);

    const pkg = {
      format: "VisionCanvasNative",
      version: doc.metadata.schemaVersion,
      docPayload: compressed,
      checksum
    };

    return JSON.stringify(pkg, null, 2);
  }

  private calculateChecksum(str: string): number {
    let crc = 0xffffffff;
    for (let i = 0; i < str.length; i++) {
      crc = (crc >>> 8) ^ ((crc ^ str.charCodeAt(i)) & 0xff);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * Basic token substitution to simulate zip/deflate compression ratio savings on string envelope.
   */
  private compressPayload(raw: string): string {
    return raw
      .replace(/"points"/g, '"pts"')
      .replace(/"canvas"/g, '"cnv"')
      .replace(/"objects"/g, '"objs"');
  }

  private decompressPayload(compressed: string): string {
    return compressed
      .replace(/"pts"/g, '"points"')
      .replace(/"cnv"/g, '"canvas"')
      .replace(/"objs"/g, '"objects"');
  }
}
