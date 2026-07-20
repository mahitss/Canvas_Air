export interface SketchRawElement {
  id: string;
  type: "shape" | "text" | "arrow" | "line" | "connector";
  geometry: {
    x: number;
    y: number;
    w: number;
    h: number;
    points?: { x: number; y: number }[];
  };
  properties?: Record<string, any>;
}

export interface SketchRawInput {
  elements: SketchRawElement[];
  groups?: { id: string; elementIds: string[] }[];
}

export interface SemanticShape {
  id: string;
  shapeType: "rectangle" | "circle" | "diamond" | "actor" | "custom";
  x: number;
  y: number;
  w: number;
  h: number;
  associatedText?: string;
}

export interface SemanticConnector {
  id: string;
  type: "arrow" | "line" | "dependency" | "association";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  fromShapeId?: string;
  toShapeId?: string;
}

export interface SemanticRepresentation {
  shapes: SemanticShape[];
  connectors: SemanticConnector[];
  texts: { id: string; content: string; x: number; y: number }[];
  containments: { parentId: string; childId: string }[];
}

export interface ClassificationResult {
  primaryType: string; // "flowchart", "mindmap", "uml", "erd", etc.
  confidenceScore: number;
  labels: { type: string; confidence: number }[]; // multi-label mapping
  timeMs: number;
}

export interface RelationshipGraph {
  nodes: { id: string; type: string; label: string | undefined }[];
  edges: { id: string; from: string; to: string; type: string; label: string | undefined }[];
  hierarchy: Map<string, string[]>; // parentId -> childIds
  containments: Map<string, string[]>; // containerId -> containedIds
}
