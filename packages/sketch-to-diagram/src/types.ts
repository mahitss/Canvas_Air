export type DiagramType =
  | "flowchart"
  | "mindmap"
  | "uml"
  | "erd"
  | "architecture";

export type LayoutStrategy = "hierarchical" | "radial" | "grid" | "force";

export interface DiagramNode {
  id: string;
  type: string; // e.g. "box", "rounded_box", "circle", "diamond", "actor"
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface DiagramEdge {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  type?: "association" | "inheritance" | "dependency" | "connector";
}

export interface DiagramGraph {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface RecognitionConfidence {
  diagramType: DiagramType;
  overallConfidence: number;
  nodeConfidence: number;
  edgeConfidence: number;
  timeMs: number;
}
