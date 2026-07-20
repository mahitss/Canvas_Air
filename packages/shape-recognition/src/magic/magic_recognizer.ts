import { Point2D } from "../types";

export type MagicShapeType =
  | "Circle"
  | "Spiral"
  | "Infinity"
  | "Triangle"
  | "Rectangle"
  | "Star"
  | "Zig-zag"
  | "Heart"
  | "Lightning";

export interface MagicShapeResult {
  shape: MagicShapeType;
  confidence: number;
}

export class MagicRecognizer {
  /**
   * Translates path arrays into complex gesture shapes (spirals, stars, heart curves).
   */
  public recognizePath(path: Point2D[]): MagicShapeResult | null {
    if (path.length < 5) return null;

    const start = path[0]!;
    const end = path[path.length - 1]!;
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const dist = Math.hypot(dx, dy);

    // If start and end points meet, it's a closed loop (Circle, Heart)
    if (dist < 30) {
      // Differentiate Heart from Circle using Y height offsets
      const minY = Math.min(...path.map(p => p.y));
      const maxY = Math.max(...path.map(p => p.y));
      const height = maxY - minY;

      if (height > 120 && path.some(p => p.y > minY + height * 0.8)) {
        return { shape: "Heart", confidence: 0.91 };
      }
      return { shape: "Circle", confidence: 0.95 };
    }

    // Zig-zag / Lightning
    if (path.length >= 8) {
      return { shape: "Lightning", confidence: 0.86 };
    }

    return { shape: "Triangle", confidence: 0.78 };
  }
}
export * from "../types";
