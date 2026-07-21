// VisionCanvas AR | Single Shared Core Stroke Engine Controller
// Centralizes all point collection, Virtual Pen spring physics, Catmull-Rom splines, and stroke management

import { DigitalInkEngine } from "../DigitalInkEngine";
import { Stroke } from "../DrawingPipeline";
import { StrokeHistory } from "./StrokeHistory";
import { StrokeExport } from "./StrokeExport";

export interface StrokeSettings {
  color: string;
  size: number;
  effect: "neon" | "solid";
  glowIntensity: number;
  tool: "pen" | "eraser" | "line" | "rect" | "circle" | "text";
  isSmartWriting?: boolean;
  text?: string;
  dt?: number;
}

export class CoreStrokeEngine {
  public history = new StrokeHistory();
  public currentStroke: Stroke | null = null;
  private digitalInk = new DigitalInkEngine();
  private isDrawing = false;

  beginStroke(x: number, y: number, settings: StrokeSettings) {
    this.digitalInk.startStroke(x, y);
    const preview = this.digitalInk.getPreviewPoints();

    this.currentStroke = {
      points: preview.length > 0 ? (preview as any) : [{ x, y }],
      rawPoints: [{ x, y }],
      isSmartWriting: settings.isSmartWriting === true,
      color: settings.color,
      size: settings.size,
      glowIntensity: settings.glowIntensity,
      effect: settings.effect,
      tool: settings.tool,
      text: settings.tool === "text" ? settings.text : undefined
    };

    this.isDrawing = true;
  }

  addPoint(x: number, y: number, settings: StrokeSettings) {
    if (!this.currentStroke) return;

    if (settings.tool === "pen" || settings.tool === "eraser") {
      const dt = settings.dt || 0.016;
      this.digitalInk.update(x, y, dt, true);
      const resampledSpline = this.digitalInk.getPreviewPoints();
      if (resampledSpline.length > 0) {
        this.currentStroke.points = resampledSpline as any;
      } else {
        this.currentStroke.points.push({ x, y });
      }
    } else {
      // Shapes overwrite end position
      this.currentStroke.points[1] = { x, y };
    }
  }

  endStroke(originalSettings?: StrokeSettings) {
    if (this.currentStroke) {
      if (this.currentStroke.tool === "pen" || this.currentStroke.tool === "eraser") {
        const finalizedSpline = this.digitalInk.finalizeStroke();
        if (finalizedSpline.length > 0) {
          this.currentStroke.points = finalizedSpline as any;
        }
      }

      if (originalSettings) {
        this.currentStroke.effect = originalSettings.effect;
        this.currentStroke.glowIntensity = originalSettings.glowIntensity;
      }

      this.history.push(this.currentStroke);
      this.currentStroke = null;
    }
    this.isDrawing = false;
  }

  undo(): boolean {
    return this.history.undo() !== null;
  }

  redo(): boolean {
    return this.history.redo() !== null;
  }

  clear() {
    this.history.clear();
    this.currentStroke = null;
    this.isDrawing = false;
  }

  exportJSON(): string {
    return StrokeExport.serialize(this.history.strokes);
  }

  get strokes(): Stroke[] {
    return this.history.strokes;
  }

  get activeStroke(): Stroke | null {
    return this.currentStroke;
  }

  get drawing(): boolean {
    return this.isDrawing;
  }
}
