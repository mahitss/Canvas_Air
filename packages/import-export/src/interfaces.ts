import { VisionCanvasDoc, DocumentMetadata } from "./domain";

export interface IFileAdapter {
  readonly supportedExtensions: string[];
  importFile(data: ArrayBuffer | string): Promise<VisionCanvasDoc>;
  exportFile(doc: VisionCanvasDoc): Promise<ArrayBuffer | string>;
}

export interface IImportService {
  registerAdapter(extension: string, adapter: IFileAdapter): void;
  importDocument(fileName: string, data: ArrayBuffer | string): Promise<VisionCanvasDoc>;
}

export interface IExportService {
  registerAdapter(extension: string, adapter: IFileAdapter): void;
  exportDocument(doc: VisionCanvasDoc, format: string): Promise<ArrayBuffer | string>;
}

export interface IDocumentValidator {
  validate(doc: VisionCanvasDoc): { isValid: boolean; errors: string[] };
}

export interface IMetadataPreserver {
  preserve(oldMetadata: DocumentMetadata, newMetadata: Partial<DocumentMetadata>): DocumentMetadata;
}
