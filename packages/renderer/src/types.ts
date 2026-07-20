export interface BoundingBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export type Matrix3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

export type RenderLayerType =
  | "Background"
  | "Grid"
  | "Drawing"
  | "Shapes"
  | "Text"
  | "Selection"
  | "Selections" // keep for compatibility
  | "Guides"
  | "Overlay"
  | "UI"
  | "Cursor"
  | "Particles" // keep for compatibility
  | "Debug";

export interface FrameBudget {
  elapsedMs: number;
  targetMs: number;
  budgetExceeded: boolean;
  frameIndex: number;
}

export type GPURenderTarget = "canvas2d" | "webgl" | "webgpu" | "offscreen";

export interface RenderPassConfig {
  name: string;
  isEnabled: boolean;
  priority: number;
}

export interface RenderingStatistics {
  fps: number;
  drawCalls: number;
  gpuMemoryUsedBytes: number;
  nodesRenderedCount: number;
  nodesCulledCount: number;
  cpuTimeMs: number;
  gpuTimeMs: number;
}
