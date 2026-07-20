export interface SketchStroke {
  id: string;
  points: { x: number; y: number }[];
  brushWidth: number;
  color: string;
}

export interface SketchSceneRepresentation {
  detectedObjects: { type: string; box: { x: number; y: number; w: number; h: number } }[];
  annotationsText: string[];
  strokeDensityScore: number;
  canvasBounds: { width: number; height: number };
  diagramSummary: string | undefined;
}

export interface PromptParameters {
  positiveTemplate: string;
  negativeTemplate: string;
  modifiers: string[];
}
