export interface DocumentMetadata {
  title: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
  customProperties?: Record<string, any>;
}

export interface CanvasLayer {
  readonly id: string;
  readonly name: string;
  readonly visible: boolean;
  readonly opacity: number;
  readonly zIndex: number;
}

export interface CanvasObjectBase {
  readonly id: string;
  readonly type: "stroke" | "shape" | "text";
  readonly layerId: string;
  readonly zIndex: number;
  readonly metadata?: Record<string, any>;
}

export interface StrokeObject extends CanvasObjectBase {
  readonly type: "stroke";
  readonly points: ReadonlyArray<{ x: number; y: number; pressure?: number }>;
  readonly color: string;
  readonly brushWidth: number;
}

export interface ShapeObject extends CanvasObjectBase {
  readonly type: "shape";
  readonly shapeType: "circle" | "rect" | "line" | "polygon";
  readonly fill?: string;
  readonly strokeColor: string;
  readonly strokeWidth: number;
  readonly transform: ReadonlyArray<number>; // transform coefficients (e.g. matrix)
}

export interface TextObject extends CanvasObjectBase {
  readonly type: "text";
  readonly content: string;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly color: string;
  readonly x: number;
  readonly y: number;
}

export type CanvasObject = StrokeObject | ShapeObject | TextObject;

export interface AssetReference {
  readonly id: string;
  readonly mimeType: string;
  readonly dataUrl: string; // Base64 encoding
  readonly sizeBytes: number;
}

export interface HistoryReference {
  readonly baseVersion: number;
  readonly patchSequence: number;
  readonly checkpointTimestamp: number;
}

export interface VisionCanvasDoc {
  readonly id: string;
  readonly metadata: DocumentMetadata;
  readonly canvas: {
    readonly width: number;
    readonly height: number;
    readonly backgroundColor: string;
  };
  readonly layers: ReadonlyArray<CanvasLayer>;
  readonly objects: ReadonlyArray<CanvasObject>;
  readonly assets: ReadonlyArray<AssetReference>;
  readonly history: HistoryReference;
}
