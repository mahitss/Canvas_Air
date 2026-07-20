import { DrawingPoint } from "../types";

export abstract class BaseBrush {
  public name: string;
  public color: string;
  public opacity: number;
  public width: number;
  public pressureEnabled: boolean;
  public flow: number;
  public hardness: number;

  constructor(
    name: string,
    color: string = "#000000",
    width: number = 5,
    opacity: number = 1.0,
    pressureEnabled: boolean = true,
    flow: number = 1.0,
    hardness: number = 0.5
  ) {
    this.name = name;
    this.color = color;
    this.width = width;
    this.opacity = opacity;
    this.pressureEnabled = pressureEnabled;
    this.flow = flow;
    this.hardness = hardness;
  }

  public get size(): number {
    return this.width;
  }

  public set size(val: number) {
    this.width = val;
  }

  /**
   * Applies common color, transparency, and composite modes to canvas draw context.
   */
  protected applyCanvasStrokeStyle(
    ctx: CanvasRenderingContext2D,
    point: DrawingPoint
  ): void {
    const currentOpacity = this.opacity;
    const currentWidth = this.pressureEnabled 
      ? this.width * point.pressure 
      : this.width;

    ctx.strokeStyle = this.color;
    ctx.globalAlpha = currentOpacity;
    ctx.lineWidth = Math.max(1, currentWidth);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  /**
   * Abstract drawing method to render a line segment on canvas context.
   */
  public abstract drawSegment(
    ctx: CanvasRenderingContext2D,
    p0: DrawingPoint,
    p1: DrawingPoint
  ): void;
}
