import { IDocumentOCRProvider } from "../interfaces";
import { OCRResult } from "../types";
import { OCRProviderException } from "../errors";

export class DefaultDocumentOCRProvider implements IDocumentOCRProvider {
  public readonly id = "default-ocr-provider";
  public readonly name = "Default Mock Local Tesseract Engine";
  public readonly type = "local";
  private initialized = false;

  public async initialize(): Promise<void> {
    this.initialized = true;
  }

  public async recognize(imageUri: string): Promise<OCRResult> {
    if (!this.initialized) {
      throw new OCRProviderException("Tesseract engine has not been initialized");
    }

    if (!imageUri) {
      throw new OCRProviderException("Image URI parameter cannot be empty");
    }

    return {
      text: "VisionCanvas OCR extracted text results.",
      confidence: 0.96,
      regions: [
        {
          x: 10,
          y: 20,
          w: 500,
          h: 40,
          text: "VisionCanvas OCR extracted text results.",
          confidence: 0.96
        }
      ],
      segments: [
        {
          id: "seg-1",
          type: "paragraph",
          x: 10,
          y: 20,
          w: 500,
          h: 40,
          content: "VisionCanvas OCR extracted text results."
        }
      ]
    };
  }

  public async health(): Promise<"healthy" | "degraded" | "down"> {
    return this.initialized ? "healthy" : "down";
  }

  public async dispose(): Promise<void> {
    this.initialized = false;
  }
}
