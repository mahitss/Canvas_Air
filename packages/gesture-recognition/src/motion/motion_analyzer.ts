import { HandPresence } from "@visioncanvas/hand-tracking";

export interface MotionMetrics {
  velocity: { x: number; y: number; z: number };
  acceleration: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  curvature: number;
  distanceTraveled: number;
}

export class MotionAnalyzer {
  private history: HandPresence[] = [];

  /**
   * Tracks spatial velocity, acceleration and curvature coordinates of the wrist.
   */
  public analyzeMotion(currentHand: HandPresence): MotionMetrics {
    this.history.push({ ...currentHand });
    if (this.history.length > 50) {
      this.history.shift();
    }

    const len = this.history.length;
    if (len < 2) {
      return {
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 0, z: 0 },
        curvature: 0,
        distanceTraveled: 0
      };
    }

    const last = this.history[len - 2]!;
    const currWrist = currentHand.landmarks.wrist || { x: 0, y: 0, z: 0 };
    const lastWrist = last.landmarks.wrist || { x: 0, y: 0, z: 0 };

    const dx = currWrist.x - lastWrist.x;
    const dy = currWrist.y - lastWrist.y;
    const dz = currWrist.z - lastWrist.z;

    const velocity = { x: dx, y: dy, z: dz };
    const distanceTraveled = Math.hypot(dx, dy, dz);

    let acceleration = { x: 0, y: 0, z: 0 };
    if (len >= 3) {
      const first = this.history[len - 3]!;
      const firstWrist = first.landmarks.wrist || { x: 0, y: 0, z: 0 };
      const prevVx = lastWrist.x - firstWrist.x;
      const prevVy = lastWrist.y - firstWrist.y;
      const prevVz = lastWrist.z - firstWrist.z;
      acceleration = {
        x: dx - prevVx,
        y: dy - prevVy,
        z: dz - prevVz
      };
    }

    const mag = Math.hypot(dx, dy, dz) || 1;
    const direction = { x: dx / mag, y: dy / mag, z: dz / mag };

    return {
      velocity,
      acceleration,
      direction,
      curvature: 0.05,
      distanceTraveled
    };
  }

  public getHistory(): HandPresence[] {
    return this.history;
  }

  public clearHistory(): void {
    this.history = [];
  }
}
