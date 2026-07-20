/**
 * Dependency Injection token Symbol registry mapping for framework-decoupled instantiation bounds.
 */
export const RENDERER_TOKENS = {
  SceneRenderer: Symbol.for("ISceneRenderer"),
  FrameScheduler: Symbol.for("IFrameScheduler"),
  RenderCamera: Symbol.for("IRenderCamera"),
  LayerManager: Symbol.for("ILayerManager"),
  GpuManager: Symbol.for("IGpuManager"),
  ViewportManager: Symbol.for("IViewportManager"),
  EventBus: Symbol.for("IRendererEventBus")
};
