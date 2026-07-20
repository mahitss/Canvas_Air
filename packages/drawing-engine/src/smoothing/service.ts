import { ISmoothingService, SmoothingConfig } from "../interfaces";
import { DrawingPoint } from "../types";
import { BezierSmoother } from "./bezier";
import { CatmullRomSmoother } from "./splines";

/**
 * Service coordinating coordinate interpolation and corner-preserving vector smoothing.
 */
export class SmoothingService implements ISmoothingService {
  constructor(
    private readonly config: SmoothingConfig = {
      algorithm: "catmull-rom",
      strength: 0.5,
      stepsPerSegment: 6,
      preserveCorners: true,
      cornerAngleThreshold: 1.0 // ~57 degrees
    }
  ) {}

  /**
   * Smooths the point sequence, preserving sharp corners if configured.
   */
  public smooth(points: DrawingPoint[]): DrawingPoint[] {
    if (points.length < 3 || this.config.algorithm === "none") {
      return points;
    }

    if (!this.config.preserveCorners) {
      return this.applyAlgorithm(points);
    }

    // Partition points into segments broken by sharp corners
    const segments: DrawingPoint[][] = [];
    let currentSegment: DrawingPoint[] = [points[0]!, points[1]!];

    for (let i = 1; i < points.length - 1; i++) {
      const pPrev = points[i - 1]!;
      const pCurr = points[i]!;
      const pNext = points[i + 1]!;

      if (this.isSharpCorner(pPrev, pCurr, pNext)) {
        // Close current segment at the corner point
        currentSegment.push(pCurr);
        segments.push(currentSegment);

        // Start new segment from the corner point
        currentSegment = [pCurr, pNext];
      } else {
        currentSegment.push(pNext);
      }
    }
    segments.push(currentSegment);

    // Smooth each segment individually and concatenate
    let result: DrawingPoint[] = [];
    for (let i = 0; i < segments.length; i++) {
      const smoothedSegment = this.applyAlgorithm(segments[i]!);
      if (i === 0) {
        result = smoothedSegment;
      } else {
        // Skip duplicate connection point at the intersection of segments
        result.push(...smoothedSegment.slice(1));
      }
    }

    return result;
  }

  private applyAlgorithm(points: DrawingPoint[]): DrawingPoint[] {
    if (this.config.algorithm === "bezier") {
      return BezierSmoother.smooth(points, this.config.stepsPerSegment);
    }
    if (this.config.algorithm === "catmull-rom") {
      return CatmullRomSmoother.smooth(points, this.config.strength, this.config.stepsPerSegment);
    }
    return points;
  }

  private isSharpCorner(p0: DrawingPoint, p1: DrawingPoint, p2: DrawingPoint): boolean {
    const v1x = p1.x - p0.x;
    const v1y = p1.y - p0.y;
    const v2x = p2.x - p1.x;
    const v2y = p2.y - p1.y;

    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

    if (len1 === 0 || len2 === 0) {
      return false;
    }

    const dot = v1x * v2x + v1y * v2y;
    const cosTheta = dot / (len1 * len2);
    const angle = Math.acos(Math.max(-1.0, Math.min(1.0, cosTheta)));

    return angle > this.config.cornerAngleThreshold;
  }
}
