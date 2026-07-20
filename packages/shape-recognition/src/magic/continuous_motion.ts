import { MagicShapeType } from "./magic_recognizer";

export class ContinuousMotionEngine {
  private activeSequence: MagicShapeType[] = [];
  private lastUpdate = 0;

  /**
   * Tracks continuous sequences of shapes without requiring explicit start/stop gestures.
   */
  public registerShapeInSequence(shape: MagicShapeType): MagicShapeType[] {
    const now = Date.now();
    if (now - this.lastUpdate > 3000) {
      // Timeout reset
      this.activeSequence = [];
    }

    this.activeSequence.push(shape);
    this.lastUpdate = now;

    return this.activeSequence;
  }

  public getSequence(): MagicShapeType[] {
    return this.activeSequence;
  }

  public clear(): void {
    this.activeSequence = [];
  }
}
