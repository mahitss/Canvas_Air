// VisionCanvas AR | Core Stroke Export & Serialization Module

import { Stroke } from "../DrawingPipeline";

export interface SerializedStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  effect: string;
  glowIntensity: number;
  tool: string;
  timestamp: number;
}

export class StrokeExport {
  static serialize(strokes: Stroke[]): string {
    const data: SerializedStroke[] = strokes.map((s, idx) => ({
      id: `stroke_${idx}_${Date.now()}`,
      points: s.points.map(p => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })),
      color: s.color,
      size: s.size,
      effect: s.effect,
      glowIntensity: s.glowIntensity,
      tool: s.tool,
      timestamp: Date.now()
    }));
    return JSON.stringify({ version: "1.0.0", application: "VisionCanvas AR", exportedAt: new Date().toISOString(), strokes: data }, null, 2);
  }

  static downloadSnapshot(canvas: HTMLCanvasElement, filename = "visioncanvas-snapshot.png") {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }
}
