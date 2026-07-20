import { MagicShapeType } from "./magic_recognizer";
import { Point2D } from "../types";

export class CreativeMotionEngine {
  /**
   * Resolves visual vfx animation types from shape outline inputs.
   */
  public getVisualEffectForShape(shape: MagicShapeType): string | null {
    switch (shape) {
      case "Lightning":
        return "Lightning animation";
      case "Heart":
        return "Heart particles";
      case "Infinity":
        return "Infinity portal";
      case "Star":
        return "Star explosion";
      default:
        return null;
    }
  }
}

export class AISuggestionsManager {
  /**
   * Evaluates drawing bounds to suggest automatic template completions.
   */
  public evaluatePartialDrawing(points: Point2D[], sketchContext: string): string | null {
    if (points.length >= 5 && sketchContext === "dragon") {
      return "Finish dragon?";
    }
    if (points.length >= 5 && sketchContext === "tree") {
      return "Complete tree?";
    }
    return null;
  }
}

export class MagicLearningEngine {
  private readonly customSpells = new Map<string, Point2D[]>();

  public learnSpell(name: string, path: Point2D[]): void {
    this.customSpells.set(name, [...path]);
  }

  public getSpell(name: string): Point2D[] | null {
    return this.customSpells.get(name) || null;
  }
}
