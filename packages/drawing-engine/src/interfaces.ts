import { DrawingPoint, DrawingStroke, CanvasLayer, HistoryCommand, DrawingStats, CanvasViewportState } from "./types";
import { DrawingEngineConfig } from "./config";
import { DrawingBusEvent, DrawingBusEventType } from "./events";

/**
 * Interface representing the primary Air Drawing Engine coordinator.
 */
export interface IDrawingEngine {
  setCanvas(canvas: any): void;
  getConfig(): DrawingEngineConfig;
  getStrokes(): DrawingStroke[];
  getCurrentStroke(): DrawingStroke | null;
  getStats(): DrawingStats;
  startStroke(screenX: number, screenY: number, screenZ?: number): void;
  addPoint(screenX: number, screenY: number, screenZ?: number): void;
  completeStroke(): void;
  undo(): void;
  redo(): void;
  clear(): void;
}

/**
 * Interface managing active stroke brushes, colors, and line configurations.
 */
export interface IBrushManager {
  getActiveBrush(): any;
  setActiveBrush(name: string): void;
  setBrushColor(color: string): void;
  setBrushWidth(width: number): void;
}

export interface ILayerManager {
  getActiveLayerId(): string | null;
  setActiveLayer(id: string): void;
  addLayer(name: string): CanvasLayer;
  removeLayer(id: string): void;
  renameLayer(id: string, name: string): void;
  reorderLayer(id: string, newIndex: number): void;
  setLayerOpacity(id: string, opacity: number): void;
  setLayerVisibility(id: string, visible: boolean): void;
  setLayerLock(id: string, locked: boolean): void;
  setLayerBlendMode(id: string, blendMode: GlobalCompositeOperation): void;
  getLayers(): CanvasLayer[];
  clear(): void;
  isDirty?(): boolean;
  clearDirty?(): void;
}

/**
 * Interface maintaining command stacks for undo/redo command replays.
 */
export interface IHistoryCommander {
  executeCommand(command: HistoryCommand): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  startTransaction(): void;
  endTransaction(): void;
  rollbackTransaction(): void;
  clear(): void;
}

/**
 * Interface managing drawing action subscribers and signal publishing.
 */
export interface IDrawingEventBus {
  publish(event: DrawingBusEvent): void;
  subscribe(
    type: DrawingBusEventType | "*",
    callback: (event: DrawingBusEvent) => void,
    options?: { replay?: boolean }
  ): () => void;
  clearHistory(): void;
  unsubscribeAll(): void;
}

export interface StrokeConfig {
  minDistanceThreshold: number;
  minTimeThresholdMs: number;
}

/**
 * Interface orchestrating point collections, density filtering, and stroke lifecycle bounds.
 */
export interface IStrokeService {
  startStroke(
    strokeId: string,
    layerId: string,
    brushConfig: { name: string; color: string; width: number; opacity: number },
    initialPoint: DrawingPoint
  ): DrawingStroke;
  addPoint(point: DrawingPoint): DrawingStroke | null;
  completeStroke(): DrawingStroke | null;
  cancelStroke(): void;
  getActiveStroke(): DrawingStroke | null;
}

export type SmoothingAlgorithm = "bezier" | "catmull-rom" | "none";

export interface SmoothingConfig {
  algorithm: SmoothingAlgorithm;
  strength: number; // For Catmull-Rom tension (e.g. 0.5)
  stepsPerSegment: number;
  preserveCorners: boolean;
  cornerAngleThreshold: number; // Angle threshold in radians (e.g., Math.PI / 4 = 45 degrees)
}

/**
 * Interface coordinating coordinate interpolation and corner-preserving vector smoothing.
 */
export interface ISmoothingService {
  smooth(points: DrawingPoint[]): DrawingPoint[];
}

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface IViewportTransform {
  getState(): CanvasViewportState;
  pan(dx: number, dy: number): void;
  zoomAt(anchorX: number, anchorY: number, factor: number): void;
  rotate(angleDegrees: number): void;
  setRotation(angleDegrees: number): void;
  reset(): void;
  screenToWorld(screenX: number, screenY: number): { x: number; y: number };
  worldToScreen(worldX: number, worldY: number): { x: number; y: number };
  resize(width: number, height: number, dpr?: number): void;
  setBounds(bounds: ViewportBounds | null): void;
  getDevicePixelRatio(): number;
}
