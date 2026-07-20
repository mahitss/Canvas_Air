import { Stroke2D, BoundingBox, CharacterFeatureSet, Point2D } from "../types";

export class StrokeAnalyzer {
  /**
   * Evaluates feature sets across a collection of drawing strokes.
   */
  public static analyze(strokes: Stroke2D[]): CharacterFeatureSet {
    if (strokes.length === 0) {
      return {
        boundingBox: { x: 0, y: 0, width: 0, height: 0 },
        aspectRatio: 1.0,
        strokeCount: 0,
        loopsCount: 0,
        hasCrossings: false
      };
    }

    const bbox = this.getCombinedBoundingBox(strokes);
    const aspect = bbox.height > 0 ? bbox.width / bbox.height : 1.0;
    
    let loops = 0;
    for (const stroke of strokes) {
      if (this.isSelfLooping(stroke)) {
        loops++;
      }
    }

    const crossings = this.detectCrossings(strokes);

    return {
      boundingBox: bbox,
      aspectRatio: aspect,
      strokeCount: strokes.length,
      loopsCount: loops,
      hasCrossings: crossings
    };
  }

  private static getCombinedBoundingBox(strokes: Stroke2D[]): BoundingBox {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const stroke of strokes) {
      for (const pt of stroke) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private static isSelfLooping(stroke: Point2D[]): boolean {
    if (stroke.length < 4) return false;
    
    // Check start and end distance
    const start = stroke[0]!;
    const end = stroke[stroke.length - 1]!;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Calculate length
    let pathLen = 0;
    for (let i = 1; i < stroke.length; i++) {
      const p1 = stroke[i - 1]!;
      const p2 = stroke[i]!;
      pathLen += Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
    }

    // A loop exists if the path ends close to where it started relative to path length
    return pathLen > 0 && (dist / pathLen < 0.25);
  }

  private static detectCrossings(strokes: Stroke2D[]): boolean {
    if (strokes.length < 2) return false;

    // Check if any line segment of stroke A intersects any line segment of stroke B
    for (let i = 0; i < strokes.length; i++) {
      for (let j = i + 1; j < strokes.length; j++) {
        if (this.doStrokesIntersect(strokes[i]!, strokes[j]!)) {
          return true;
        }
      }
    }

    return false;
  }

  private static doStrokesIntersect(s1: Point2D[], s2: Point2D[]): boolean {
    for (let i = 1; i < s1.length; i++) {
      const a1 = s1[i - 1]!;
      const a2 = s1[i]!;

      for (let j = 1; j < s2.length; j++) {
        const b1 = s2[j - 1]!;
        const b2 = s2[j]!;

        if (this.lineSegmentsIntersect(a1, a2, b1, b2)) {
          return true;
        }
      }
    }

    return false;
  }

  private static lineSegmentsIntersect(p1: Point2D, p2: Point2D, q1: Point2D, q2: Point2D): boolean {
    const d1 = this.ccw(p1, p2, q1);
    const d2 = this.ccw(p1, p2, q2);
    const d3 = this.ccw(q1, q2, p1);
    const d4 = this.ccw(q1, q2, p2);

    return (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)));
  }

  private static ccw(a: Point2D, b: Point2D, c: Point2D): number {
    return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
  }
}
export * from "../types";
