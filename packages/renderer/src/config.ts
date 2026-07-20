import { GPURenderTarget } from "./types";

export interface RendererConfig {
  targetFps: number;
  vsync: boolean;
  renderingQuality: "low" | "medium" | "high";
  antiAliasing: boolean;
  postProcessingEnabled: boolean;
  gpuTarget: GPURenderTarget;
  debugMode: boolean;
  
  // Post-processing toggles
  bloomEnabled: boolean;
  glowEnabled: boolean;
  vignetteEnabled: boolean;
}

export const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  targetFps: 60,
  vsync: true,
  renderingQuality: "high",
  antiAliasing: true,
  postProcessingEnabled: true,
  gpuTarget: "canvas2d",
  debugMode: false,
  
  bloomEnabled: false,
  glowEnabled: true,
  vignetteEnabled: false
};
