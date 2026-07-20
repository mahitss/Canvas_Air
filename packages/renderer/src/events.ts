import { FrameBudget, RenderingStatistics } from "./types";

export interface FrameStartedEvent {
  type: "FrameStarted";
  payload: {
    frameIndex: number;
    timestamp: number;
  };
  timestamp: number;
}

export interface FrameRenderedEvent {
  type: "FrameRendered";
  payload: {
    budget: FrameBudget;
    statistics: RenderingStatistics;
  };
  timestamp: number;
}

export interface FrameDroppedEvent {
  type: "FrameDropped";
  payload: {
    frameIndex: number;
    reason: string;
  };
  timestamp: number;
}

export interface SceneUpdatedEvent {
  type: "SceneUpdated";
  payload: {
    nodeCount: number;
  };
  timestamp: number;
}

export interface CameraMovedEvent {
  type: "CameraMoved";
  payload: {
    panX: number;
    panY: number;
    zoom: number;
    rotation: number;
  };
  timestamp: number;
}

export interface ViewportChangedEvent {
  type: "ViewportChanged";
  payload: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  timestamp: number;
}

export interface RenderErrorEvent {
  type: "RenderError";
  payload: {
    error: string;
    details?: string;
  };
  timestamp: number;
}

export interface LayerVisibilityToggledEvent {
  type: "LayerVisibilityToggled";
  payload: {
    layerId: string;
    visible: boolean;
  };
  timestamp: number;
}

export interface GpuDeviceLostEvent {
  type: "GpuDeviceLost";
  payload: {
    reason: string;
  };
  timestamp: number;
}

export interface RendererErrorOccurredEvent {
  type: "RendererErrorOccurred";
  payload: {
    error: string;
    code: string;
  };
  timestamp: number;
}

export type RendererBusEvent =
  | FrameStartedEvent
  | FrameRenderedEvent
  | FrameDroppedEvent
  | SceneUpdatedEvent
  | CameraMovedEvent
  | ViewportChangedEvent
  | RenderErrorEvent
  | LayerVisibilityToggledEvent
  | GpuDeviceLostEvent
  | RendererErrorOccurredEvent;

export interface RendererSubscribeOptions {
  replay?: boolean;
}

/**
 * Pub-sub event bus contract coordinating drawing and viewport engine frames events.
 */
export interface IRendererEventBus {
  publish(event: RendererBusEvent): void;
  subscribe(
    type: RendererBusEvent["type"] | "*",
    callback: (event: RendererBusEvent) => void,
    options?: RendererSubscribeOptions
  ): () => void;
  getHistory(): RendererBusEvent[];
}
