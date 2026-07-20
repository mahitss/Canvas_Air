import { BaseBrush } from "./base";
import { DrawingPoint } from "../types";

export class PenBrush extends BaseBrush {
  public drawSegment(ctx: CanvasRenderingContext2D, p0: DrawingPoint, p1: DrawingPoint): void {
    ctx.beginPath();
    this.applyCanvasStrokeStyle(ctx, p1);
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

export class PencilBrush extends BaseBrush {
  public drawSegment(ctx: CanvasRenderingContext2D, p0: DrawingPoint, p1: DrawingPoint): void {
    ctx.beginPath();
    // Pencil has slightly lower opacity and thickness variation to mimic graphite texture
    const currentWidth = this.pressureEnabled ? this.width * p1.pressure : this.width;
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = this.opacity * 0.45;
    ctx.lineWidth = Math.max(0.8, currentWidth);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Draw scattered graphite grain particles around point
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 3; i++) {
      const rx = (Math.random() - 0.5) * currentWidth * 2;
      const ry = (Math.random() - 0.5) * currentWidth * 2;
      ctx.fillRect(p1.x + rx, p1.y + ry, 1, 1);
    }
  }
}

export class MarkerBrush extends BaseBrush {
  public drawSegment(ctx: CanvasRenderingContext2D, p0: DrawingPoint, p1: DrawingPoint): void {
    ctx.beginPath();
    // Marker is wider and has flat square caps
    const currentWidth = this.pressureEnabled ? this.width * p1.pressure : this.width;
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = this.opacity * 0.75;
    ctx.lineWidth = Math.max(2, currentWidth);
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";

    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

export class CalligraphyBrush extends BaseBrush {
  public angle: number = 45; // Broad nib fountain pen angle

  public drawSegment(ctx: CanvasRenderingContext2D, p0: DrawingPoint, p1: DrawingPoint): void {
    // Draws broad-nib stroke by drawing a parallelogram offset by Nib Angle
    const thickness = this.pressureEnabled ? this.width * p1.pressure : this.width;
    const rad = (this.angle * Math.PI) / 180;
    
    // Compute nib shape offsets
    const dx = Math.cos(rad) * thickness * 0.5;
    const dy = Math.sin(rad) * thickness * 0.5;

    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;

    ctx.beginPath();
    ctx.moveTo(p0.x - dx, p0.y - dy);
    ctx.lineTo(p0.x + dx, p0.y + dy);
    ctx.lineTo(p1.x + dx, p1.y + dy);
    ctx.lineTo(p1.x - dx, p1.y - dy);
    ctx.closePath();
    ctx.fill();
  }
}

export class HighlighterBrush extends BaseBrush {
  public drawSegment(ctx: CanvasRenderingContext2D, p0: DrawingPoint, p1: DrawingPoint): void {
    ctx.beginPath();
    // Highlighter has a yellow transparent multiply tint
    const currentWidth = this.width * 2.5; // wider stroke
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = currentWidth;
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";

    // Set multiply blend mode so it overlaps text behind it
    ctx.globalCompositeOperation = "multiply";

    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Reset composite mode
    ctx.globalCompositeOperation = "source-over";
  }
}

export class NeonBrush extends BaseBrush {
  public drawSegment(ctx: CanvasRenderingContext2D, p0: DrawingPoint, p1: DrawingPoint): void {
    const currentWidth = this.pressureEnabled ? this.width * p1.pressure : this.width;

    // 1. Draw glowing blurred outer halo stroke
    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = this.opacity * 0.3;
    ctx.lineWidth = currentWidth * 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = this.color;
    ctx.shadowBlur = currentWidth * 1.5;
    
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // 2. Draw sharp bright white center core stroke
    ctx.beginPath();
    ctx.strokeStyle = "#FFFFFF";
    ctx.globalAlpha = this.opacity;
    ctx.lineWidth = currentWidth * 0.7;
    ctx.shadowBlur = 0; // Clear shadow properties
    
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

export class LaserBrush extends BaseBrush {
  public drawSegment(ctx: CanvasRenderingContext2D, p0: DrawingPoint, p1: DrawingPoint): void {
    ctx.beginPath();
    // Laser is extremely thin and has bright saturated color
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

export class ParticleBrush extends BaseBrush {
  public drawSegment(ctx: CanvasRenderingContext2D, p0: DrawingPoint, p1: DrawingPoint): void {
    const thickness = this.pressureEnabled ? this.width * p1.pressure : this.width;
    ctx.fillStyle = this.color;
    
    // Generate scattered splatters along point trajectory
    const density = 8;
    for (let i = 0; i < density; i++) {
      const ratio = i / density;
      const x = p0.x + (p1.x - p0.x) * ratio;
      const y = p0.y + (p1.y - p0.y) * ratio;
      
      const rx = (Math.random() - 0.5) * thickness * 3.5;
      const ry = (Math.random() - 0.5) * thickness * 3.5;
      const particleSize = Math.max(0.8, Math.random() * thickness * 0.35);

      ctx.beginPath();
      ctx.globalAlpha = Math.random() * this.opacity * 0.6;
      ctx.arc(x + rx, y + ry, particleSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export class EraserBrush extends BaseBrush {
  public drawSegment(ctx: CanvasRenderingContext2D, p0: DrawingPoint, p1: DrawingPoint): void {
    ctx.beginPath();
    const currentWidth = this.pressureEnabled ? this.width * p1.pressure : this.width;

    // Use destination-out to clear pixels
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = currentWidth * 2.0; // Eraser is slightly wider for easy clearance
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Reset composite mode
    ctx.globalCompositeOperation = "source-over";
  }
}

export class AirbrushBrush extends BaseBrush {
  public drawSegment(ctx: CanvasRenderingContext2D, p0: DrawingPoint, p1: DrawingPoint): void {
    const currentWidth = this.pressureEnabled ? this.width * p1.pressure : this.width;
    const rad = currentWidth * 0.5;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(dist / 2)); // spacing steps

    ctx.save();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = p0.x + dx * t;
      const y = p0.y + dy * t;

      const grad = ctx.createRadialGradient(x, y, rad * this.hardness, x, y, rad);
      grad.addColorStop(0, this.color);
      grad.addColorStop(1, "transparent");

      ctx.fillStyle = grad;
      ctx.globalAlpha = this.opacity * this.flow;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
