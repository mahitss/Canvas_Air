export interface TextRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  confidence: number;
}

export type SegmentType = "heading" | "paragraph" | "list" | "table" | "form" | "column" | "header" | "footer";

export interface LayoutSegment {
  id: string;
  type: SegmentType;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
}

export interface OCRResult {
  text: string;
  confidence: number;
  regions: TextRegion[];
  segments: LayoutSegment[];
}

export interface DocumentEntity {
  type: string; // e.g. "email", "url", "date", "amount"
  value: string;
  textSpan: string;
  confidence?: number;
}

export interface TableCell {
  r: number;
  c: number;
  text: string;
  merged?: boolean;
}

export interface TableStructure {
  rows: number;
  cols: number;
  cells: TableCell[];
  headers: string[];
}

export interface FormField {
  label: string;
  value: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fieldType: "input" | "checkbox" | "radio" | "signature";
  required: boolean;
}


export interface OCRProvider {
  id: string;
  name: string;
  extractText(imageUri: string): Promise<OCRResult>;
}
