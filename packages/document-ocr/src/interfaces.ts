import { DocumentRawInput, StructuredDocumentModel } from "./domain";
import { OCRResult } from "./types";

export interface IDocumentParser {
  parse(input: DocumentRawInput): Promise<StructuredDocumentModel>;
}

export interface IDocumentOCRProvider {
  id: string;
  name: string;
  type: "local" | "cloud" | "llm";
  initialize(): Promise<void>;
  recognize(imageUri: string): Promise<OCRResult>;
  health(): Promise<"healthy" | "degraded" | "down">;
  dispose(): Promise<void>;
}

export interface IDocumentIntelligenceManager {
  process(input: DocumentRawInput): Promise<StructuredDocumentModel>;
}
