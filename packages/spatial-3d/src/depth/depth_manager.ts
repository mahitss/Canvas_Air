import { Vector3 } from "../types";

export interface DepthFrame {
  id: string;
  width: number;
  height: number;
  depthBuffer: Float32Array;
  confidenceBuffer: Float32Array;
}

export class DepthManager {
  private activeFrame: DepthFrame | null = null;

  public updateDepthFrame(frame: DepthFrame): void {
    this.activeFrame = frame;
  }

  /**
   * Estimates direct line-of-sight distance offsets using depth pixel calculations.
   */
  public estimateDistance(x: number, y: number): { distance: number; confidence: number } {
    if (!this.activeFrame) {
      return { distance: 0, confidence: 0 };
    }

    const idx = y * this.activeFrame.width + x;
    if (idx < 0 || idx >= this.activeFrame.depthBuffer.length) {
      return { distance: 0, confidence: 0 };
    }

    return {
      distance: this.activeFrame.depthBuffer[idx]!,
      confidence: this.activeFrame.confidenceBuffer[idx] ?? 0.8
    };
  }

  /**
   * Evaluates if a point is occluded by spatial geometry.
   */
  public checkOcclusion(target: Vector3, viewMatrix: Float32Array): boolean {
    void viewMatrix;
    // Mock occlusion checker: if coordinate z is too deep relative to bounds, assert true
    return target.z < -10;
  }

  /**
   * Detects collision contacts between a moving user and bounding radii.
   */
  public checkCollision(pos: Vector3, radius: number, obstacles: Vector3[]): boolean {
    for (const obs of obstacles) {
      const dist = Math.hypot(pos.x - obs.x, pos.y - obs.y, pos.z - obs.z);
      if (dist < radius) {
        return true;
      }
    }
    return false;
  }
}
export * from "../types";
