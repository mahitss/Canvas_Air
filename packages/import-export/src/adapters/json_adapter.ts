import { IFileAdapter } from "../interfaces";
import { VisionCanvasDoc } from "../domain";

export class JsonFileAdapter implements IFileAdapter {
  public readonly supportedExtensions = ["json", "vcanvas"];

  public async importFile(data: ArrayBuffer | string): Promise<VisionCanvasDoc> {
    const rawString = typeof data === "string" ? data : new TextDecoder().decode(data);
    return JSON.parse(rawString);
  }

  public async exportFile(doc: VisionCanvasDoc): Promise<ArrayBuffer | string> {
    return JSON.stringify(doc, null, 2);
  }
}
