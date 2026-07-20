import { BoundingBox, Matrix3 } from "../types";
import { IRenderCamera } from "../interfaces";

/**
 * Advanced Camera2D supporting view/projection matrices, coordinate space conversions,
 * boundary constraints, smooth transition LERPs, and anchor/pivot-point zooming.
 */
export class Camera2D implements IRenderCamera {
  // Current values
  public panX = 0;
  public panY = 0;
  public zoom = 1.0;
  public rotation = 0; // Rotation in degrees

  // Transition targets for smooth movement LERPs
  public targetPanX = 0;
  public targetPanY = 0;
  public targetZoom = 1.0;
  public targetRotation = 0;

  // Zoom & Pan constraints clamping
  public minZoom = 0.1;
  public maxZoom = 10.0;
  public panBounds: BoundingBox | null = null;

  // Viewport dimensions
  private viewportWidth = 1920;
  private viewportHeight = 1080;

  constructor(width = 1920, height = 1080) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public resize(width: number, height: number): void {
    this.setViewportSize(width, height);
  }

  /**
   * Pans the camera by absolute screen delta units.
   */
  public pan(dx: number, dy: number): void {
    this.targetPanX += dx;
    this.targetPanY += dy;
    this.applyConstraints();
  }

  /**
   * Zooms to the designated absolute scale factor.
   */
  public zoomTo(factor: number): void {
    this.targetZoom = factor;
    this.applyConstraints();
  }

  /**
   * Zooms around a specific canvas screen coordinates pivot point.
   */
  public zoomAround(clientX: number, clientY: number, factor: number): void {
    const worldPivot = this.clientToWorld(clientX, clientY);
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, factor));

    const rad = (this.targetRotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Solve pan parameters so worldPivot maps to clientX/clientY under new targetZoom scale
    this.targetPanX = clientX - this.targetZoom * (cos * worldPivot.x - sin * worldPivot.y);
    this.targetPanY = clientY - this.targetZoom * (sin * worldPivot.x + cos * worldPivot.y);
    
    this.applyConstraints();
  }

  /**
   * Performs frame rate-independent LERP smoothing towards pan, zoom, and rotation targets.
   */
  public update(deltaTimeMs: number): void {
    if (deltaTimeMs <= 0) return;

    const lerpFactor = 1.0 - Math.exp(-0.008 * deltaTimeMs);

    this.panX += (this.targetPanX - this.panX) * lerpFactor;
    this.panY += (this.targetPanY - this.panY) * lerpFactor;
    this.zoom += (this.targetZoom - this.zoom) * lerpFactor;
    this.rotation += (this.targetRotation - this.rotation) * lerpFactor;

    this.applyConstraints();
  }

  /**
   * Teleports camera values to match targets immediately, bypassing LERP smoothing.
   */
  public snapToTargets(): void {
    this.panX = this.targetPanX;
    this.panY = this.targetPanY;
    this.zoom = this.targetZoom;
    this.rotation = this.targetRotation;
    this.applyConstraints();
  }

  /**
   * Transforms screen client coordinates to 2D world space coordinates.
   */
  public clientToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rad = (this.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = clientX - this.panX;
    const dy = clientY - this.panY;

    // Inverse matrix translation: x = cos*(dx/z) + sin*(dy/z)
    const x = cos * (dx / this.zoom) + sin * (dy / this.zoom);
    const y = -sin * (dx / this.zoom) + cos * (dy / this.zoom);

    return { x, y };
  }

  /**
   * Transforms 2D world space coordinates to viewport screen client coordinates.
   */
  public worldToClient(worldX: number, worldY: number): { x: number; y: number } {
    const rad = (this.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Matrix view transform: Z * (cos*x - sin*y) + px
    const clientX = this.zoom * (cos * worldX - sin * worldY) + this.panX;
    const clientY = this.zoom * (sin * worldX + cos * worldY) + this.panY;

    return { x: clientX, y: clientY };
  }

  /**
   * Computes the final Camera View Transform Matrix mapping world coordinates to screen coordinate outputs.
   */
  public getViewMatrix(): Matrix3 {
    const rad = (this.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Camera view transform: Translate -> Rotate -> Zoom
    return [
      this.zoom * cos, -this.zoom * sin, this.panX,
      this.zoom * sin,  this.zoom * cos, this.panY,
      0,                0,               1
    ];
  }

  /**
   * Computes the analytical inverse View matrix for fast viewport-to-world unprojection.
   */
  public getInverseViewMatrix(): Matrix3 {
    const rad = (this.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const z = this.zoom;

    return [
      cos / z,  sin / z,  (-this.panX * cos - this.panY * sin) / z,
      -sin / z, cos / z,  ( this.panX * sin - this.panY * cos) / z,
      0,        0,        1
    ];
  }

  /**
   * Computes NDC orthographic projection matrix mapping screen space to WebGL clip coordinate bounds [-1.0, 1.0].
   */
  public getProjectionMatrix(): Matrix3 {
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    
    return [
      2.0 / w,  0,        -1.0,
      0,       -2.0 / h,   1.0,
      0,        0,         1.0
    ];
  }

  /**
   * Checks whether the specified node bounding box lies within the camera frustum viewport limits.
   * If not, the node is culled (skipped during pipeline sweeps).
   */
  public isVisible(bounds: BoundingBox): boolean {
    const viewMin = this.clientToWorld(0, 0);
    const viewMax = this.clientToWorld(this.viewportWidth, this.viewportHeight);

    const minX = Math.min(viewMin.x, viewMax.x);
    const maxX = Math.max(viewMin.x, viewMax.x);
    const minY = Math.min(viewMin.y, viewMax.y);
    const maxY = Math.max(viewMin.y, viewMax.y);

    const culled =
      bounds.xMax < minX ||
      bounds.xMin > maxX ||
      bounds.yMax < minY ||
      bounds.yMin > maxY;

    return !culled;
  }

  private applyConstraints(): void {
    // Zoom clamping
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom));

    // Pan clamping boundaries
    if (this.panBounds) {
      this.panX = Math.max(this.panBounds.xMin, Math.min(this.panBounds.xMax, this.panX));
      this.panY = Math.max(this.panBounds.yMin, Math.min(this.panBounds.yMax, this.panY));
      this.targetPanX = Math.max(this.panBounds.xMin, Math.min(this.panBounds.xMax, this.targetPanX));
      this.targetPanY = Math.max(this.panBounds.yMin, Math.min(this.panBounds.yMax, this.targetPanY));
    }
  }
}
