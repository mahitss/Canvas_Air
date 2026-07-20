import { EmitterPreset } from "../types";

export class PresetManager {
  private presets: Map<string, EmitterPreset> = new Map();

  constructor() {
    this.registerBuiltInPresets();
  }

  private registerBuiltInPresets(): void {
    // 1. Fire Preset Emitter Config
    this.presets.set("Fire", {
      name: "Fire",
      shape: "circle",
      spawnRate: 80,
      burstCount: 0,
      lifetimeRange: [0.5, 1.2],
      speedRange: [40, 90],
      sizeRange: [5, 12],
      colorPalette: ["#FF3D00", "#FF9100", "#FFEA00", "#FF1744"],
      opacityRange: [0.8, 1.0],
      blendMode: "lighter",
      gravity: -1.5, // Float upwards
      drag: 0.05,
      noiseAmplitude: 15
    });

    // 2. Electricity / Sparks Preset Emitter Config
    this.presets.set("Electricity", {
      name: "Electricity",
      shape: "point",
      spawnRate: 150,
      burstCount: 5,
      lifetimeRange: [0.1, 0.4],
      speedRange: [150, 300],
      sizeRange: [1, 3],
      colorPalette: ["#00E5FF", "#D500F9", "#FFFFFF", "#2979FF"],
      opacityRange: [0.9, 1.0],
      blendMode: "screen",
      gravity: 0.0,
      drag: 0.01,
      noiseAmplitude: 50
    });

    // 3. Neon Glow Trail Preset Emitter Config
    this.presets.set("Neon", {
      name: "Neon",
      shape: "point",
      spawnRate: 40,
      burstCount: 0,
      lifetimeRange: [0.8, 1.6],
      speedRange: [10, 30],
      sizeRange: [6, 10],
      colorPalette: ["#E040FB", "#00E676", "#FFD600", "#00B0FF"],
      opacityRange: [0.7, 0.9],
      blendMode: "lighter",
      gravity: 0.0,
      drag: 0.1,
      noiseAmplitude: 5
    });

    // 4. Magic / Pixie Sparkles Preset Emitter Config
    this.presets.set("Magic", {
      name: "Magic",
      shape: "circle",
      spawnRate: 60,
      burstCount: 3,
      lifetimeRange: [1.0, 2.5],
      speedRange: [20, 50],
      sizeRange: [2, 6],
      colorPalette: ["#FF80AB", "#EA80FC", "#B9F6CA", "#80D8FF"],
      opacityRange: [0.6, 0.8],
      blendMode: "lighter",
      gravity: 0.1, // Drift downwards slightly
      drag: 0.02,
      noiseAmplitude: 12
    });

    // 5. Sparkles Preset Emitter Config
    this.presets.set("Sparkles", {
      name: "Sparkles",
      shape: "circle",
      spawnRate: 40,
      burstCount: 5,
      lifetimeRange: [0.6, 1.4],
      speedRange: [30, 80],
      sizeRange: [2, 5],
      colorPalette: ["#FFD700", "#FFF8DC", "#FFDF00", "#FFFFFF"],
      opacityRange: [0.8, 1.0],
      blendMode: "lighter",
      gravity: 0.1,
      drag: 0.05,
      noiseAmplitude: 8
    });

    // 6. Smoke Preset Emitter Config
    this.presets.set("Smoke", {
      name: "Smoke",
      shape: "rectangle",
      spawnRate: 15,
      burstCount: 0,
      lifetimeRange: [1.5, 3.0],
      speedRange: [10, 25],
      sizeRange: [20, 45],
      colorPalette: ["#90A4AE", "#CFD8DC", "#B0BEC5", "#78909C"],
      opacityRange: [0.2, 0.4],
      blendMode: "source-over",
      gravity: -0.2,
      drag: 0.05,
      noiseAmplitude: 5
    });

    // 7. Ribbon Preset Emitter Config
    this.presets.set("Ribbon", {
      name: "Ribbon",
      shape: "point",
      spawnRate: 120,
      burstCount: 0,
      lifetimeRange: [0.4, 0.8],
      speedRange: [5, 15],
      sizeRange: [4, 8],
      colorPalette: ["#FF4081", "#E040FB", "#00E676", "#00B0FF"],
      opacityRange: [0.8, 1.0],
      blendMode: "source-over",
      gravity: 0.0,
      drag: 0.1,
      noiseAmplitude: 2
    });

    // 8. Dust Preset Emitter Config
    this.presets.set("Dust", {
      name: "Dust",
      shape: "rectangle",
      spawnRate: 10,
      burstCount: 0,
      lifetimeRange: [2.0, 4.0],
      speedRange: [2, 8],
      sizeRange: [1, 3],
      colorPalette: ["#ECEFF1", "#CFD8DC", "#B0BEC5"],
      opacityRange: [0.3, 0.6],
      blendMode: "screen",
      gravity: 0.05,
      drag: 0.02,
      noiseAmplitude: 1
    });

    // 9. Glow Preset Emitter Config
    this.presets.set("Glow", {
      name: "Glow",
      shape: "point",
      spawnRate: 20,
      burstCount: 0,
      lifetimeRange: [0.5, 1.0],
      speedRange: [0, 5],
      sizeRange: [30, 60],
      colorPalette: ["#FFEB3B", "#FF9800", "#4CAF50", "#2196F3"],
      opacityRange: [0.1, 0.3],
      blendMode: "lighter",
      gravity: 0.0,
      drag: 0.1,
      noiseAmplitude: 0
    });

    // 10. Trail Preset Emitter Config
    this.presets.set("Trail", {
      name: "Trail",
      shape: "point",
      spawnRate: 90,
      burstCount: 0,
      lifetimeRange: [0.3, 0.7],
      speedRange: [10, 30],
      sizeRange: [3, 6],
      colorPalette: ["#00E5FF", "#D500F9", "#FFFFFF"],
      opacityRange: [0.6, 0.9],
      blendMode: "screen",
      gravity: 0.0,
      drag: 0.05,
      noiseAmplitude: 4
    });

    // 11. Cyberpunk Preset Emitter Config
    this.presets.set("Cyberpunk", {
      name: "Cyberpunk",
      shape: "point",
      spawnRate: 60,
      burstCount: 0,
      lifetimeRange: [0.5, 1.0],
      speedRange: [50, 100],
      sizeRange: [4, 8],
      colorPalette: ["#FF007F", "#00F0FF", "#39FF14"],
      opacityRange: [0.8, 1.0],
      blendMode: "lighter",
      gravity: 0.0,
      drag: 0.05,
      noiseAmplitude: 10
    });

    // 12. Sci-Fi Preset Emitter Config
    this.presets.set("Sci-Fi", {
      name: "Sci-Fi",
      shape: "circle",
      spawnRate: 40,
      burstCount: 5,
      lifetimeRange: [0.8, 1.5],
      speedRange: [30, 70],
      sizeRange: [3, 6],
      colorPalette: ["#00FFCC", "#0099FF", "#330099"],
      opacityRange: [0.7, 0.9],
      blendMode: "screen",
      gravity: 0.0,
      drag: 0.02,
      noiseAmplitude: 5
    });

    // 13. Fantasy Preset Emitter Config
    this.presets.set("Fantasy", {
      name: "Fantasy",
      shape: "circle",
      spawnRate: 50,
      burstCount: 3,
      lifetimeRange: [1.2, 2.8],
      speedRange: [15, 45],
      sizeRange: [2, 7],
      colorPalette: ["#E0B0FF", "#DA70D6", "#FFC0CB"],
      opacityRange: [0.5, 0.8],
      blendMode: "lighter",
      gravity: -0.1,
      drag: 0.03,
      noiseAmplitude: 8
    });

    // 14. Minimal Preset Emitter Config
    this.presets.set("Minimal", {
      name: "Minimal",
      shape: "point",
      spawnRate: 15,
      burstCount: 0,
      lifetimeRange: [0.5, 1.0],
      speedRange: [5, 15],
      sizeRange: [1, 3],
      colorPalette: ["#FFFFFF", "#000000"],
      opacityRange: [0.9, 1.0],
      blendMode: "source-over",
      gravity: 0.0,
      drag: 0.1,
      noiseAmplitude: 1
    });

    // 15. Matrix Preset Emitter Config
    this.presets.set("Matrix", {
      name: "Matrix",
      shape: "rectangle",
      spawnRate: 100,
      burstCount: 0,
      lifetimeRange: [1.0, 2.5],
      speedRange: [80, 150],
      sizeRange: [2, 5],
      colorPalette: ["#00FF00", "#008000", "#003300"],
      opacityRange: [0.8, 1.0],
      blendMode: "source-over",
      gravity: 2.0, // fall down
      drag: 0.01,
      noiseAmplitude: 2
    });

    // 16. Galaxy Preset Emitter Config
    this.presets.set("Galaxy", {
      name: "Galaxy",
      shape: "circle",
      spawnRate: 80,
      burstCount: 10,
      lifetimeRange: [1.5, 3.5],
      speedRange: [20, 60],
      sizeRange: [1, 4],
      colorPalette: ["#4B0082", "#8A2BE2", "#0000FF", "#FF1493"],
      opacityRange: [0.4, 0.9],
      blendMode: "lighter",
      gravity: 0.0,
      drag: 0.02,
      noiseAmplitude: 15
    });

    // 17. Arcade Preset Emitter Config
    this.presets.set("Arcade", {
      name: "Arcade",
      shape: "point",
      spawnRate: 70,
      burstCount: 12,
      lifetimeRange: [0.4, 0.9],
      speedRange: [100, 200],
      sizeRange: [3, 8],
      colorPalette: ["#FFCC00", "#FF3300", "#FF00FF", "#00CCFF"],
      opacityRange: [0.9, 1.0],
      blendMode: "source-over",
      gravity: 1.0,
      drag: 0.05,
      noiseAmplitude: 20
    });
  }

  public getPreset(name: string): EmitterPreset {
    const preset = this.presets.get(name);
    if (!preset) {
      throw new Error(`Emitter Preset '${name}' was not found in registry.`);
    }
    return preset;
  }

  public addPreset(preset: EmitterPreset): void {
    this.presets.set(preset.name, preset);
  }

  public deletePreset(name: string): boolean {
    return this.presets.delete(name);
  }

  public getPresetsList(): EmitterPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Serializes all user registered presets into a raw JSON string.
   */
  public exportPresetsJSON(): string {
    const list = this.getPresetsList();
    return JSON.stringify(list, null, 2);
  }

  /**
   * Parses JSON string to import emitter presets.
   */
  public loadPresetsJSON(json: string): void {
    const list = JSON.parse(json) as EmitterPreset[];
    for (const item of list) {
      if (item && item.name) {
        this.addPreset(item);
      }
    }
  }
}
export * from "../types";
