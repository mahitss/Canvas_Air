import { SnappingConfig } from "./types";

export interface ShapeEngineConfig {
  recognitionSensitivity: number; // 0.0 - 1.0
  confidenceThreshold: number;   // 0.0 - 1.0 (defaults to 0.70)
  autoCorrectionEnabled: boolean;
  snappingEnabled: boolean;
  snapping: SnappingConfig;
  simplifierTolerance: number;    // Douglas-Peucker epsilon parameter
}

export const DEFAULT_SHAPE_CONFIG: ShapeEngineConfig = {
  recognitionSensitivity: 0.8,
  confidenceThreshold: 0.70,
  autoCorrectionEnabled: true,
  snappingEnabled: true,
  snapping: {
    gridSize: 20,         // 20px spacing snaps
    snapDistance: 10,     // 10px snap radius distance limits
    angleSnapStepDeg: 15  // Snap rotation to 15 degree intervals
  },
  simplifierTolerance: 2.5
};
