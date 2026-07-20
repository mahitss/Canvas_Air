export interface DocumentRawInput {
  uri: string;
  format: "pdf" | "png" | "jpeg" | "native";
  data: ArrayBuffer | string;
}

export interface ParsedBlock {
  id: string;
  type: "text" | "table" | "form-field" | "image";
  content: string;
  boundingBox: { x: number; y: number; w: number; h: number };
  confidence: number;
}

export interface ParsedRegion {
  id: string;
  role: "header" | "footer" | "body" | "sidebar";
  boundingBox: { x: number; y: number; w: number; h: number };
  blocks: ParsedBlock[];
}

export interface ParsedPage {
  pageNumber: number;
  dimensions: { width: number; height: number };
  regions: ParsedRegion[];
}

export interface ParsedMetadata {
  title: string | undefined;
  author: string | undefined;
  pageCount: number;
  fileSizeBytes: number;
  extractedEntities: { type: string; value: string }[];
}

export interface StructuredDocumentModel {
  id: string;
  pages: ParsedPage[];
  metadata: ParsedMetadata;
  sourceUri: string;
}
