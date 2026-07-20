export type SmoothingType = "bezier" | "catmull-rom" | "chaikin" | "none";

export interface DrawingEngineConfig {
  defaultBrushName: string;
  defaultBrushColor: string;
  defaultBrushWidth: number;
  defaultBrushOpacity: number;
  
  smoothingEnabled: boolean;
  smoothingType: SmoothingType;
  chaikinIterations: number;         // Level of iterations for Chaikin corners (1 to 4)
  catmullRomTension: number;          // Tensor factor (0.0 to 1.0)
  
  pressureSensitivity: number;        // Factor scaling physical inputs to pressure curve
  pressureMinimum: number;            // Clamp minimum pressure threshold
  
  maxHistorySize: number;             // Maximum undo history steps count
  layerLimit: number;                 // Maximum layers limit allowed (0 for unlimited)
  gridSize: number;                   // Visual grid alignment spacing size in pixels
  gridSnapEnabled: boolean;           // Toggle auto snapping coordinates to grid spacing
}

export const DEFAULT_DRAWING_CONFIG: DrawingEngineConfig = {
  defaultBrushName: "Pen",
  defaultBrushColor: "#00E5FF",
  defaultBrushWidth: 5,
  defaultBrushOpacity: 1.0,
  
  smoothingEnabled: true,
  smoothingType: "catmull-rom",
  chaikinIterations: 2,
  catmullRomTension: 0.5,
  
  pressureSensitivity: 0.8,
  pressureMinimum: 0.15,
  
  maxHistorySize: 100,
  layerLimit: 50,
  gridSize: 40,
  gridSnapEnabled: false
};
