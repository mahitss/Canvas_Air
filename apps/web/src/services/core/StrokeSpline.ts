// VisionCanvas AR | Core Stroke Engine Spline & Resampling Module

export interface StrokePoint {
  x: number;
  y: number;
  timestamp?: number | undefined;
  velocity?: number | undefined;
  width?: number | undefined;
}

export class StrokeSpline {
  // Resample points at uniform distance intervals (2.5px step)
  static resample(points: StrokePoint[], distanceStep = 2.5): StrokePoint[] {
    if (points.length < 2) return [...points];

    const resampled: StrokePoint[] = [{ ...points[0]! }];
    let accumulatedDist = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLen = Math.hypot(dx, dy);

      if (segmentLen < 0.001) continue;

      let segmentProgress = 0;
      while (accumulatedDist + (segmentLen - segmentProgress) >= distanceStep) {
        const remainingToStep = distanceStep - accumulatedDist;
        segmentProgress += remainingToStep;
        const ratio = segmentProgress / segmentLen;

        const nx = p1.x + dx * ratio;
        const ny = p1.y + dy * ratio;
        const nvel = (p1.velocity || 0) + ((p2.velocity || 0) - (p1.velocity || 0)) * ratio;
        const nwidth = (p1.width || 0) + ((p2.width || 0) - (p1.width || 0)) * ratio;

        resampled.push({
          x: nx,
          y: ny,
          timestamp: Date.now(),
          velocity: nvel,
          width: nwidth
        });
        accumulatedDist = 0;
      }
      accumulatedDist += (segmentLen - segmentProgress);
    }

    const last = points[points.length - 1]!;
    if (resampled.length < 2 || Math.hypot(last.x - resampled[resampled.length - 1]!.x, last.y - resampled[resampled.length - 1]!.y) > 0.5) {
      resampled.push({ ...last });
    }

    return resampled;
  }

  // Generate Catmull-Rom cubic spline points
  static generateCatmullRom(points: StrokePoint[], stepsPerSegment = 6): StrokePoint[] {
    if (points.length < 2) return [...points];
    if (points.length === 2) return [...points];

    const spline: StrokePoint[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1]! : points[i]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const p3 = i < points.length - 2 ? points[i + 2]! : p2;

      for (let s = 0; s < stepsPerSegment; s++) {
        const t = s / stepsPerSegment;
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );

        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );

        spline.push({
          x,
          y,
          velocity: p1.velocity !== undefined ? p1.velocity : 0,
          width: p1.width !== undefined ? p1.width : 0
        });
      }
    }
    spline.push({ ...points[points.length - 1]! });
    return spline;
  }
}
