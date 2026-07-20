export interface DrawingPoint {
  x: number;             // Screen or coordinate relative X
  y: number;             // Screen or coordinate relative Y
  z?: number | undefined;            // Optional depth mapping coordinates
  pressure: number;      // Calculated pressure value (0.0 to 1.0)
  velocityX: number;     // Current movement velocity component
  velocityY: number;     // Current movement velocity component
  timestamp: number;     // Timestamp in milliseconds
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  brushName: string;
  color: string;
  width: number;
  opacity: number;
  layerId: string;
  isLocked: boolean;
  isVisible: boolean;
}

export interface CanvasLayer {
  id: string;
  name: string;
  opacity: number;      // Layer opacity (0.0 to 1.0)
  isVisible: boolean;
  isLocked: boolean;
  blendMode: GlobalCompositeOperation;
}

export interface CanvasViewportState {
  panX: number;
  panY: number;
  zoom: number;
  rotation: number;     // Viewport rotation angle in degrees
}

export interface HistoryCommand {
  id: string;
  execute(): void;
  undo(): void;
}

export interface DrawingStats {
  activeStrokesCount: number;
  pointsCollectedCount: number;
  fps: number;
  latencyMs: number;
}
