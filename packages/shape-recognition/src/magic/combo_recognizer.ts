export class GestureComboEngine {
  private gestureBuffer: string[] = [];
  private lastTimestamp = 0;

  /**
   * Registers a sequence of individual gestures into a combined combo command.
   */
  public addGesture(gesture: string): string | null {
    const now = Date.now();
    if (now - this.lastTimestamp > 2000) {
      // Reset sequence after 2s inactivity
      this.gestureBuffer = [];
    }

    this.gestureBuffer.push(gesture);
    this.lastTimestamp = now;

    // Match Combo shortcut: Point -> Swipe -> Pinch
    const len = this.gestureBuffer.length;
    if (len >= 3) {
      const match = this.gestureBuffer.slice(len - 3);
      if (match[0] === "Point" && match[1] === "Swipe" && match[2] === "Pinch") {
        this.gestureBuffer = []; // reset
        return "Point-Swipe-Pinch Combo";
      }
    }

    return null;
  }

  public getBuffer(): string[] {
    return this.gestureBuffer;
  }
}
