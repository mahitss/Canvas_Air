import { BaseBrush } from "./base";
import { DrawingEngineConfig } from "../config";
import {
  PenBrush,
  PencilBrush,
  MarkerBrush,
  CalligraphyBrush,
  HighlighterBrush,
  NeonBrush,
  LaserBrush,
  ParticleBrush,
  EraserBrush,
  AirbrushBrush
} from "./registry";

export class BrushManager {
  private brushes: Map<string, BaseBrush> = new Map();
  private activeBrushName: string;

  constructor(config: DrawingEngineConfig) {
    
    // Register standard preset brushes
    this.registerBrush(new PenBrush("Pen", config.defaultBrushColor, config.defaultBrushWidth, config.defaultBrushOpacity, true));
    this.registerBrush(new PencilBrush("Pencil", config.defaultBrushColor, config.defaultBrushWidth, config.defaultBrushOpacity, true));
    this.registerBrush(new MarkerBrush("Marker", config.defaultBrushColor, config.defaultBrushWidth, config.defaultBrushOpacity, true));
    this.registerBrush(new CalligraphyBrush("Calligraphy", config.defaultBrushColor, config.defaultBrushWidth, config.defaultBrushOpacity, true));
    this.registerBrush(new AirbrushBrush("Airbrush", config.defaultBrushColor, config.defaultBrushWidth, config.defaultBrushOpacity, true, 0.8, 0.2));
    this.registerBrush(new HighlighterBrush("Highlighter", "#FFFF00", 25, 0.4, false));
    this.registerBrush(new NeonBrush("Neon", "#FF00FF", 6, 1.0, true));
    this.registerBrush(new LaserBrush("Laser", "#FF0000", 3, 1.0, false));
    this.registerBrush(new ParticleBrush("Particle Brush", config.defaultBrushColor, 8, 1.0, true));
    this.registerBrush(new EraserBrush("Eraser", "#000000", 15, 1.0, true));

    // Fallback active selection setting
    this.activeBrushName = config.defaultBrushName;
  }

  public registerBrush(brush: BaseBrush): void {
    this.brushes.set(brush.name, brush);
  }

  public getBrush(name: string): BaseBrush | undefined {
    return this.brushes.get(name);
  }

  public getActiveBrush(): BaseBrush {
    const brush = this.getBrush(this.activeBrushName);
    if (!brush) {
      // Fallback
      return this.brushes.get("Pen")!;
    }
    return brush;
  }

  public setActiveBrush(name: string): void {
    if (this.brushes.has(name)) {
      this.activeBrushName = name;
    }
  }

  public setBrushColor(color: string): void {
    for (const brush of this.brushes.values()) {
      // Do not override eraser or highlighter fixed color properties
      if (brush.name !== "Eraser" && brush.name !== "Highlighter") {
        brush.color = color;
      }
    }
  }

  public setBrushWidth(width: number): void {
    const active = this.getActiveBrush();
    active.width = Math.max(1, width);
  }

  public setBrushOpacity(opacity: number): void {
    const active = this.getActiveBrush();
    active.opacity = Math.max(0.0, Math.min(1.0, opacity));
  }
}

export * from "./base";
export * from "./registry";
