import { FrameBudget, RenderingStatistics, BoundingBox, Matrix3, RenderLayerType } from "./types";
import { RendererConfig } from "./config";

/**
 * Scene renderer pipeline contract.
 */
export interface ISceneRenderer {
  setCanvas(canvas: HTMLCanvasElement): void;
  renderFrame(budget: FrameBudget): void;
  getStatistics(): RenderingStatistics;
  getConfig(): RendererConfig;
  updateConfig(config: Partial<RendererConfig>): void;
}

/**
 * Frame scheduling contract.
 */
export interface IFrameScheduler {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

/**
 * Camera projection viewport boundaries and culling contract.
 */
export interface IRenderCamera {
  pan(dx: number, dy: number): void;
  zoomTo(factor: number): void;
  getViewMatrix(): Matrix3;
  getInverseViewMatrix(): Matrix3;
  isVisible(bounds: BoundingBox): boolean;
  resize(width: number, height: number): void;
}

/**
 * Canvas layer payload data model.
 */
export interface ILayer {
  id: string;
  name: string;
  type: RenderLayerType;
  visible: boolean;
  opacity: number;
  zIndex: number;
}

/**
 * Layer Manager registry contract.
 */
export interface ILayerManager {
  addLayer(layer: ILayer): void;
  removeLayer(id: string): void;
  setLayerVisibility(id: string, visible: boolean): void;
  setLayerOpacity(id: string, opacity: number): void;
  getLayers(): ILayer[];
  getLayerById(id: string): ILayer | undefined;
}

/**
 * GPU resources and memory metrics payload.
 */
export interface IGpuStats {
  allocatedBuffersCount: number;
  allocatedTexturesCount: number;
  shaderProgramsCount: number;
  cacheHits: number;
  gpuMemoryUsedBytes: number;
}

/**
 * GPU Resource Manager cache abstraction contract.
 */
export interface IGpuManager {
  getOrCreateBuffer(id: string, byteSize: number, initialData?: Float32Array): any;
  getOrCreateTexture(id: string, width: number, height: number, data?: Uint8Array): any;
  getOrCreateShaderProgram(id: string, vertexSource: string, fragmentSource: string): any;
  deleteResource(id: string): void;
  getStats(): IGpuStats;
  clearCache(): void;
}

/**
 * Viewport configuration payload.
 */
export interface IViewport {
  width: number;
  height: number;
  devicePixelRatio: number;
}

/**
 * Viewport dimensions and screen-to-world coordinate mapping contract.
 */
export interface IViewportManager {
  setViewport(width: number, height: number, dpr?: number): void;
  getViewport(): IViewport;
  clientToWorld(clientX: number, clientY: number): { x: number; y: number };
  worldToClient(worldX: number, worldY: number): { x: number; y: number };
}
