export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export class NavigationEngine {
  private camera: CameraState = { x: 0, y: 0, zoom: 1.0 };

  /**
   * Applies pan transformations and zoom updates dynamically to the coordinate projection.
   */
  public pan(dx: number, dy: number): void {
    this.camera.x += dx;
    this.camera.y += dy;
  }

  public zoom(factor: number, centerX = 960, centerY = 540): void {
    const oldZoom = this.camera.zoom;
    this.camera.zoom = Math.max(0.1, Math.min(10.0, this.camera.zoom * factor));

    // Shift coordinates pivot to center zooms focus
    const scaleRatio = this.camera.zoom / oldZoom;
    this.camera.x = centerX - (centerX - this.camera.x) * scaleRatio;
    this.camera.y = centerY - (centerY - this.camera.y) * scaleRatio;
  }

  public focusObject(x: number, y: number): void {
    this.camera.x = 960 - x;
    this.camera.y = 540 - y;
    this.camera.zoom = 1.5;
  }

  public resetCamera(): void {
    this.camera = { x: 0, y: 0, zoom: 1.0 };
  }

  public getCameraState(): CameraState {
    return this.camera;
  }
}
