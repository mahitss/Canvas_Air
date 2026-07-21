// VisionCanvas AR | Core Brush Manager (Presets for All Drawing Modes)

export type BrushPresetType = "neon" | "marker" | "pencil" | "calligraphy" | "glow" | "engineering" | "highlighter";

export interface BrushPreset {
  id: BrushPresetType;
  name: string;
  defaultColor: string;
  defaultSize: number;
  glowIntensity: number;
  effect: "neon" | "solid";
  alpha: number;
}

export class BrushManager {
  private static PRESETS: Record<BrushPresetType, BrushPreset> = {
    neon: {
      id: "neon",
      name: "Neon Glow",
      defaultColor: "#38bdf8",
      defaultSize: 8,
      glowIntensity: 22,
      effect: "neon",
      alpha: 1.0
    },
    marker: {
      id: "marker",
      name: "Solid Marker",
      defaultColor: "#ef4444",
      defaultSize: 10,
      glowIntensity: 0,
      effect: "solid",
      alpha: 1.0
    },
    pencil: {
      id: "pencil",
      name: "Fine Pencil",
      defaultColor: "#ffffff",
      defaultSize: 3,
      glowIntensity: 0,
      effect: "solid",
      alpha: 0.9
    },
    calligraphy: {
      id: "calligraphy",
      name: "Calligraphy Ink",
      defaultColor: "#6366f1",
      defaultSize: 7,
      glowIntensity: 10,
      effect: "neon",
      alpha: 1.0
    },
    glow: {
      id: "glow",
      name: "Glow Pen",
      defaultColor: "#a855f7",
      defaultSize: 12,
      glowIntensity: 30,
      effect: "neon",
      alpha: 1.0
    },
    engineering: {
      id: "engineering",
      name: "Engineering Blue",
      defaultColor: "#0284c7",
      defaultSize: 4,
      glowIntensity: 5,
      effect: "solid",
      alpha: 1.0
    },
    highlighter: {
      id: "highlighter",
      name: "Highlighter",
      defaultColor: "#eab308",
      defaultSize: 20,
      glowIntensity: 0,
      effect: "solid",
      alpha: 0.35
    }
  };

  static getPreset(preset: BrushPresetType): BrushPreset {
    return this.PRESETS[preset] || this.PRESETS.neon;
  }
}
