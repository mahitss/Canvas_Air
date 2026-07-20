export type BrushType =
  | "Neon"
  | "Laser"
  | "Lightning"
  | "Fire"
  | "Ice"
  | "Galaxy"
  | "Magic"
  | "Rainbow"
  | "Smoke"
  | "Hologram"
  | "Crystal";

export interface BrushPreset {
  type: BrushType;
  color: string;
  glowWidth: number;
  bloomIntensity: number;
  customTextureUrl?: string;
}

export class BrushEngine {
  private activeBrush: BrushType = "Neon";
  private readonly customBrushes = new Map<string, BrushPreset>();

  public selectBrush(type: BrushType): void {
    this.activeBrush = type;
  }

  public registerCustomBrush(name: string, preset: BrushPreset): void {
    this.customBrushes.set(name, { ...preset });
  }

  /**
   * Retrieves structural preset options based on dynamic brush configurations.
   */
  public getActiveBrushPreset(): BrushPreset {
    const custom = this.customBrushes.get(this.activeBrush);
    if (custom) return custom;

    // Default presets dictionary
    switch (this.activeBrush) {
      case "Laser":
        return { type: "Laser", color: "#FF1744", glowWidth: 4, bloomIntensity: 2.0 };
      case "Lightning":
        return { type: "Lightning", color: "#00E5FF", glowWidth: 6, bloomIntensity: 1.5 };
      case "Fire":
        return { type: "Fire", color: "#FF3D00", glowWidth: 10, bloomIntensity: 1.8 };
      default:
        return { type: "Neon", color: "#E040FB", glowWidth: 8, bloomIntensity: 1.2 };
    }
  }

  public getActiveBrushType(): BrushType {
    return this.activeBrush;
  }
}
