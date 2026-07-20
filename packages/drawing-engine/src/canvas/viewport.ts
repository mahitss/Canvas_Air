import { CanvasViewportState } from "../types";
import { DrawingEngineConfig } from "../config";
import { IViewportTransform, ViewportBounds } from "../interfaces";

export class ViewportTransform implements IViewportTransform {
  private config: DrawingEngineConfig;
  private state: CanvasViewportState;
  private bounds: ViewportBounds | null = null;
  private canvasWidth = 1920;
  private canvasHeight = 1080;
  private dpr = 1.0;

  constructor(config: DrawingEngineConfig) {
    this.config = config;
    this.state = {
      panX: 0,
      panY: 0,
      zoom: 1.0,
      rotation: 0 // degrees
    };
  }

  public getState(): CanvasViewportState {
    return { ...this.state };
  }

  public getDevicePixelRatio(): number {
    return this.dpr;
  }

  public resize(width: number, height: number, dpr: number = 1.0): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.dpr = dpr;
    this.clampViewport();
  }

  public setBounds(bounds: ViewportBounds | null): void {
    this.bounds = bounds;
    this.clampViewport();
  }

  public pan(dx: number, dy: number): void {
    this.state.panX += dx;
    this.state.panY += dy;
    this.clampViewport();
  }

  public zoomAt(anchorX: number, anchorY: number, factor: number): void {
    const previousZoom = this.state.zoom;
    // Limit zoom level bounds (e.g. 0.1x to 20x)
    this.state.zoom = Math.max(0.1, Math.min(20.0, this.state.zoom * factor));
    
    const actualFactor = this.state.zoom / previousZoom;
    
    // Adjust pan coordinates so the anchor point remains stationary on screen
    this.state.panX = anchorX - (anchorX - this.state.panX) * actualFactor;
    this.state.panY = anchorY - (anchorY - this.state.panY) * actualFactor;
    this.clampViewport();
  }

  public rotate(angleDegrees: number): void {
    this.state.rotation = (this.state.rotation + angleDegrees) % 360;
  }

  public setRotation(angleDegrees: number): void {
    this.state.rotation = angleDegrees % 360;
  }

  public reset(): void {
    this.state = {
      panX: 0,
      panY: 0,
      zoom: 1.0,
      rotation: 0
    };
    this.clampViewport();
  }

  private clampViewport(): void {
    if (!this.bounds) {
      return;
    }

    // World center of screen bounds viewport:
    const centerScreenX = this.canvasWidth / 2;
    const centerScreenY = this.canvasHeight / 2;

    // Apply inverse transform to calculate world coordinate bounds center:
    const worldCenterX = (centerScreenX - this.state.panX) / this.state.zoom;
    const worldCenterY = (centerScreenY - this.state.panY) / this.state.zoom;

    // Clamp world coordinates center to bounds
    const clampedWorldCenterX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, worldCenterX));
    const clampedWorldCenterY = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, worldCenterY));

    // Recalculate pan back to screen space coordinate index based on clamped center
    this.state.panX = centerScreenX - clampedWorldCenterX * this.state.zoom;
    this.state.panY = centerScreenY - clampedWorldCenterY * this.state.zoom;
  }

  /**
   * Translates screen-space coordinate point coordinates back to infinite world-canvas coordinate indices.
   */
  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    let px = screenX - this.state.panX;
    let py = screenY - this.state.panY;

    // Apply inverse zoom scale
    px /= this.state.zoom;
    py /= this.state.zoom;

    // Apply inverse rotation if rotation is active
    if (this.state.rotation !== 0) {
      const rad = (-this.state.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = px * cos - py * sin;
      const ry = px * sin + py * cos;
      px = rx;
      py = ry;
    }

    // Apply grid snapping if configured active
    if (this.config.gridSnapEnabled) {
      const snap = this.config.gridSize;
      px = Math.round(px / snap) * snap;
      py = Math.round(py / snap) * snap;
    }

    return { x: px, y: py };
  }

  /**
   * Projects infinite world-canvas coordinates back into rendering screen pixel bounds.
   */
  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    let px = worldX;
    let py = worldY;

    // Apply rotation transformation
    if (this.state.rotation !== 0) {
      const rad = (this.state.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = px * cos - py * sin;
      const ry = px * sin + py * cos;
      px = rx;
      py = ry;
    }

    // Apply zoom scale and pan translations
    return {
      x: px * this.state.zoom + this.state.panX,
      y: py * this.state.zoom + this.state.panY
    };
  }
}
