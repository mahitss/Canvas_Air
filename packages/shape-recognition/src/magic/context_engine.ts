import { MagicShapeType } from "./magic_recognizer";

export class ContextAwarenessEngine {
  /**
   * Modulates shape recognition outputs based on the current active brush.
   */
  public resolveContextualAction(shape: MagicShapeType, brushName: string): string {
    if (shape === "Circle") {
      if (brushName === "Fire Brush") {
        return "Portal of fire";
      }
      if (brushName === "Galaxy Brush") {
        return "Galaxy vortex";
      }
    }

    if (shape === "Heart" && brushName === "Fire Brush") {
      return "Burning Heart";
    }

    return `Standard ${shape}`;
  }
}
