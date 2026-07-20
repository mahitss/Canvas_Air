import { MagicShapeType } from "./magic_recognizer";

export class GestureMemoryEngine {
  private recentShapes: MagicShapeType[] = [];

  public recordGesture(shape: MagicShapeType): string | null {
    this.recentShapes.push(shape);
    if (this.recentShapes.length > 10) {
      this.recentShapes.shift();
    }

    const len = this.recentShapes.length;
    if (len >= 3) {
      const match = this.recentShapes.slice(len - 3);
      // Repeated same shapes
      if (match[0] === match[1] && match[1] === match[2]) {
        return `Favorite Action for ${shape}`;
      }
    }

    return null;
  }

  public getRecent(): MagicShapeType[] {
    return this.recentShapes;
  }
}

export class AdaptiveAIConfigurator {
  private userDrawSpeed = "medium";
  private isShaky = false;

  public evaluateStyle(speed: number, jitter: number): { sensitivity: number; smoothing: number; stabilization: boolean } {
    if (speed > 250) {
      this.userDrawSpeed = "fast";
    } else if (speed < 50) {
      this.userDrawSpeed = "slow";
    }

    if (jitter > 15) {
      this.isShaky = true;
    }

    return {
      sensitivity: this.userDrawSpeed === "fast" ? 1.5 : 1.0,
      smoothing: this.userDrawSpeed === "slow" ? 0.8 : 0.4,
      stabilization: this.isShaky
    };
  }

  public getDrawSpeed(): string {
    return this.userDrawSpeed;
  }
}
