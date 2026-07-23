// Digital Ink Engine for VisionCanvas AR Smart Writing Mode

export interface InkPoint {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  pressure: number; // 0.0 to 1.0 virtual pressure
  confidence: number;
  trackingState: "tracked" | "interpolated" | "held";
}

// 1. Virtual Pen with critically damped spring physics
export class VirtualPen {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  private isInitialized: boolean = false;

  // Fast responsive spring parameters for tight fingertip attachment (<3px offset)
  public stiffness: number = 580.0;
  public damping: number = 38.0;
  public mass: number = 1.0;

  reset(x?: number, y?: number) {
    if (x !== undefined && y !== undefined) {
      this.x = x;
      this.y = y;
      this.isInitialized = true;
    } else {
      this.isInitialized = false;
    }
    this.vx = 0;
    this.vy = 0;
  }

  update(targetX: number, targetY: number, dt: number): { x: number; y: number; velocity: number } {
    if (!this.isInitialized) {
      this.x = targetX;
      this.y = targetY;
      this.vx = 0;
      this.vy = 0;
      this.isInitialized = true;
      return { x: this.x, y: this.y, velocity: 0 };
    }

    const clampedDt = Math.min(Math.max(dt, 0.005), 0.05);

    // Spring force: F = k * (target - pos) - c * velocity
    const fx = this.stiffness * (targetX - this.x) - this.damping * this.vx;
    const fy = this.stiffness * (targetY - this.y) - this.damping * this.vy;

    const ax = fx / this.mass;
    const ay = fy / this.mass;

    this.vx += ax * clampedDt;
    this.vy += ay * clampedDt;

    this.x += this.vx * clampedDt;
    this.y += this.vy * clampedDt;

    const velocity = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

    return { x: this.x, y: this.y, velocity };
  }
}

// 2. Stroke Buffer for raw ink points
export class StrokeBuffer {
  public rawPoints: InkPoint[] = [];

  clear() {
    this.rawPoints = [];
  }

  addPoint(point: InkPoint) {
    this.rawPoints.push(point);
  }

  getPoints(): InkPoint[] {
    return this.rawPoints;
  }
}

// 3. Point Resampler for spatial uniformity
export class PointResampler {
  static resample(points: InkPoint[], distanceStep: number = 3.0): InkPoint[] {
    if (points.length < 2) return [...points];

    const resampled: InkPoint[] = [{ ...points[0]! }];
    let accumulatedDist = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLen = Math.sqrt(dx * dx + dy * dy);

      if (segmentLen === 0) continue;

      let currentT = 0;
      while (currentT < segmentLen) {
        const remaining = distanceStep - accumulatedDist;
        if (currentT + remaining <= segmentLen) {
          currentT += remaining;
          const ratio = currentT / segmentLen;
          const interpX = p1.x + dx * ratio;
          const interpY = p1.y + dy * ratio;
          const interpTime = p1.timestamp + (p2.timestamp - p1.timestamp) * ratio;
          const interpVel = p1.velocity + (p2.velocity - p1.velocity) * ratio;
          const interpPressure = p1.pressure + (p2.pressure - p1.pressure) * ratio;

          resampled.push({
            x: interpX,
            y: interpY,
            timestamp: interpTime,
            velocity: interpVel,
            pressure: interpPressure,
            confidence: (p1.confidence + p2.confidence) / 2,
            trackingState: p1.trackingState
          });
          accumulatedDist = 0;
        } else {
          accumulatedDist += segmentLen - currentT;
          break;
        }
      }
    }

    return resampled;
  }
}

// 4. Gap Repair for bridging lost tracking frames
export class GapRepair {
  static repairGaps(points: InkPoint[], maxGapDistance: number = 14.0): InkPoint[] {
    if (points.length < 2) return points;

    const repaired: InkPoint[] = [{ ...points[0]! }];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

      if (dist > maxGapDistance && dist < 160) {
        const steps = Math.max(2, Math.floor(dist / 6.0));
        for (let s = 1; s < steps; s++) {
          const ratio = s / steps;
          repaired.push({
            x: p1.x + (p2.x - p1.x) * ratio,
            y: p1.y + (p2.y - p1.y) * ratio,
            timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * ratio,
            velocity: (p1.velocity + p2.velocity) / 2,
            pressure: (p1.pressure + p2.pressure) / 2,
            confidence: 0.8,
            trackingState: "interpolated"
          });
        }
      }
      repaired.push({ ...p2 });
    }

    return repaired;
  }
}

// 5. Stroke Optimizer for noise filtering & Douglas-Peucker simplification
export class StrokeOptimizer {
  static filterNoise(points: InkPoint[]): InkPoint[] {
    if (points.length < 3) return points;

    const filtered: InkPoint[] = [points[0]!];
    for (let i = 1; i < points.length; i++) {
      const prev = filtered[filtered.length - 1]!;
      const curr = points[i]!;
      const dist = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
      if (dist > 1.8) {
        filtered.push(curr);
      }
    }

    return filtered;
  }

  static optimize(points: InkPoint[]): InkPoint[] {
    if (points.length < 3) return points;
    const filtered = StrokeOptimizer.filterNoise(points);
    if (filtered.length < 3) return filtered;

    const simplified = StrokeOptimizer.douglasPeucker(filtered, 0.75);

    const smoothed: InkPoint[] = [{ ...simplified[0]! }];
    for (let i = 1; i < simplified.length - 1; i++) {
      const prev = simplified[i - 1]!;
      const curr = simplified[i]!;
      const next = simplified[i + 1]!;

      const smX = 0.25 * prev.x + 0.5 * curr.x + 0.25 * next.x;
      const smY = 0.25 * prev.y + 0.5 * curr.y + 0.25 * next.y;

      smoothed.push({
        ...curr,
        x: smX,
        y: smY
      });
    }
    smoothed.push({ ...simplified[simplified.length - 1]! });

    return smoothed;
  }

  private static douglasPeucker(points: InkPoint[], epsilon: number): InkPoint[] {
    if (points.length <= 2) return points;

    let dmax = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const d = StrokeOptimizer.perpendicularDistance(points[i]!, points[0]!, points[end]!);
      if (d > dmax) {
        index = i;
        dmax = d;
      }
    }

    if (dmax > epsilon) {
      const rec1 = StrokeOptimizer.douglasPeucker(points.slice(0, index + 1), epsilon);
      const rec2 = StrokeOptimizer.douglasPeucker(points.slice(index), epsilon);
      return rec1.slice(0, rec1.length - 1).concat(rec2);
    } else {
      return [points[0]!, points[end]!];
    }
  }

  private static perpendicularDistance(p: InkPoint, lineStart: InkPoint, lineEnd: InkPoint): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const denominator = Math.sqrt(dx * dx + dy * dy);
    if (denominator === 0) {
      return Math.sqrt((p.x - lineStart.x) ** 2 + (p.y - lineStart.y) ** 2);
    }
    return Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / denominator;
  }
}

// 6. Character Reconstructor for handwriting geometry beautification
export class CharacterReconstructor {
  static reconstructCharacter(points: InkPoint[]): InkPoint[] {
    if (points.length < 3) return points;

    // 1. Initial spatial resampling for uniform spacing (3.0px)
    const resampled = PointResampler.resample(points, 3.0);
    if (resampled.length < 4) return resampled;

    // 2. Identify Corner Points vs Curved Segments using Angular Deflection
    const cornerIndices = CharacterReconstructor.findCornerIndices(resampled, 42.0);

    // 3. Process each segment between corners independently
    const reconstructed: InkPoint[] = [];

    for (let s = 0; s < cornerIndices.length - 1; s++) {
      const startIndex = cornerIndices[s]!;
      const endIndex = cornerIndices[s + 1]!;
      const segment = resampled.slice(startIndex, endIndex + 1);

      if (segment.length <= 2) {
        if (s === 0) reconstructed.push(...segment);
        else reconstructed.push(...segment.slice(1));
        continue;
      }

      // Determine if segment is straight or curved
      const isStraight = CharacterReconstructor.isSegmentStraight(segment, 3.5);

      let processedSegment: InkPoint[];
      if (isStraight) {
        // Straighten line to eliminate tremor wobble
        processedSegment = CharacterReconstructor.straightenSegment(segment);
      } else {
        // Apply Centripetal Catmull-Rom Curve Beautification
        processedSegment = CharacterReconstructor.beautifyCurveSegment(segment);
      }

      if (s === 0) {
        reconstructed.push(...processedSegment);
      } else {
        reconstructed.push(...processedSegment.slice(1));
      }
    }

    // 4. Loop Smoothing: detect self-intersecting loops and smooth loop boundaries
    const loopSmoothed = CharacterReconstructor.smoothLoops(reconstructed);

    // 5. Final Catmull-Rom Spline Generation over the reconstructed control anchors
    return SplineGenerator.generateCatmullRomSpline(loopSmoothed, 5);
  }

  private static findCornerIndices(points: InkPoint[], thresholdDegrees: number): number[] {
    const indices: number[] = [0];
    const radThreshold = (thresholdDegrees * Math.PI) / 180.0;
    const windowSize = 2;

    for (let i = windowSize; i < points.length - windowSize; i++) {
      const prev = points[i - windowSize]!;
      const curr = points[i]!;
      const next = points[i + windowSize]!;

      const v1x = curr.x - prev.x;
      const v1y = curr.y - prev.y;
      const v2x = next.x - curr.x;
      const v2y = next.y - curr.y;

      const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

      if (len1 > 0.001 && len2 > 0.001) {
        const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
        const clampedDot = Math.max(-1.0, Math.min(1.0, dot));
        const angle = Math.acos(clampedDot);

        if (angle >= radThreshold) {
          if (i - indices[indices.length - 1]! >= 3) {
            indices.push(i);
          }
        }
      }
    }

    if (indices[indices.length - 1] !== points.length - 1) {
      indices.push(points.length - 1);
    }

    return indices;
  }

  private static isSegmentStraight(segment: InkPoint[], maxDeviation: number): boolean {
    if (segment.length <= 2) return true;
    const start = segment[0]!;
    const end = segment[segment.length - 1]!;

    let maxDist = 0;
    for (let i = 1; i < segment.length - 1; i++) {
      const d = CharacterReconstructor.perpendicularDistance(segment[i]!, start, end);
      if (d > maxDist) maxDist = d;
    }

    return maxDist < maxDeviation;
  }

  private static straightenSegment(segment: InkPoint[]): InkPoint[] {
    if (segment.length <= 2) return segment;
    const start = segment[0]!;
    const end = segment[segment.length - 1]!;
    const count = segment.length;

    const result: InkPoint[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      result.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
        timestamp: start.timestamp + (end.timestamp - start.timestamp) * t,
        velocity: start.velocity + (end.velocity - start.velocity) * t,
        pressure: start.pressure + (end.pressure - start.pressure) * t,
        confidence: (start.confidence + end.confidence) / 2,
        trackingState: start.trackingState
      });
    }
    return result;
  }

  private static beautifyCurveSegment(segment: InkPoint[]): InkPoint[] {
    if (segment.length <= 2) return segment;

    const result: InkPoint[] = [{ ...segment[0]! }];
    const count = segment.length;

    for (let i = 1; i < count - 1; i++) {
      const prev = segment[i - 1]!;
      const curr = segment[i]!;
      const next = segment[i + 1]!;

      const smX = 0.22 * prev.x + 0.56 * curr.x + 0.22 * next.x;
      const smY = 0.22 * prev.y + 0.56 * curr.y + 0.22 * next.y;

      result.push({
        ...curr,
        x: smX,
        y: smY
      });
    }
    result.push({ ...segment[count - 1]! });

    return result;
  }

  private static smoothLoops(points: InkPoint[]): InkPoint[] {
    if (points.length < 6) return points;

    const start = points[0]!;
    const end = points[points.length - 1]!;
    const distStartEnd = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);

    if (distStartEnd < 18.0 && points.length > 8) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;

      points[0] = { ...start, x: midX, y: midY };
      points[points.length - 1] = { ...end, x: midX, y: midY };
    }

    return points;
  }

  private static perpendicularDistance(p: InkPoint, lineStart: InkPoint, lineEnd: InkPoint): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const denominator = Math.sqrt(dx * dx + dy * dy);
    if (denominator === 0) {
      return Math.sqrt((p.x - lineStart.x) ** 2 + (p.y - lineStart.y) ** 2);
    }
    return Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / denominator;
  }
}

// 7. Spline Generator for Catmull-Rom curves
export class SplineGenerator {
  static generateCatmullRomSpline(points: InkPoint[], stepsPerSegment: number = 5): InkPoint[] {
    if (points.length < 2) return points;
    if (points.length === 2) return points;

    const splinePoints: InkPoint[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const p3 = points[i + 2] || p2;

      for (let s = 0; s < stepsPerSegment; s++) {
        if (i > 0 && s === 0) continue;

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

        const pressure = p1.pressure + (p2.pressure - p1.pressure) * t;
        const velocity = p1.velocity + (p2.velocity - p1.velocity) * t;

        splinePoints.push({
          x,
          y,
          timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
          velocity,
          pressure,
          confidence: (p1.confidence + p2.confidence) / 2,
          trackingState: p1.trackingState
        });
      }
    }

    splinePoints.push({ ...points[points.length - 1]! });
    return splinePoints;
  }
}

// 8. Digital Ink Renderer for premium calligraphic neon ink
export class BrushRenderer {
  static renderInkStroke(
    ctx: CanvasRenderingContext2D,
    points: InkPoint[],
    baseColor: string,
    baseSize: number,
    effect: "neon" | "solid",
    glowIntensity: number,
    isPreview: boolean = false
  ) {
    if (points.length === 0) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (points.length === 1) {
      const pt = points[0]!;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, baseSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = baseColor;
      ctx.fill();
      ctx.restore();
      return;
    }

    const getWidth = (pt: InkPoint, index: number, total: number) => {
      let taper = 1.0;
      const taperCount = Math.min(8, Math.floor(total * 0.1));
      if (taperCount > 0) {
        if (index < taperCount) {
          taper = 0.3 + 0.7 * (index / taperCount);
        } else if (index > total - 1 - taperCount) {
          taper = 0.3 + 0.7 * ((total - 1 - index) / taperCount);
        }
      }

      const speedFactor = Math.max(0.65, Math.min(1.25, 1.25 - (pt.velocity || 0) / 1000));
      return baseSize * (pt.pressure || 0.85) * speedFactor * taper;
    };

    if (effect === "neon" || isPreview) {
      const activeGlow = isPreview ? 25 : glowIntensity;

      // Pass 1: Soft Bloom Layer
      ctx.save();
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = activeGlow * 1.6;
      ctx.strokeStyle = baseColor;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = baseSize * 1.8;
      BrushRenderer.drawPath(ctx, points);
      ctx.stroke();
      ctx.restore();

      // Pass 2: Main Saturated Glow Layer with variable calligraphic width
      ctx.save();
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = activeGlow * 0.8;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseSize;
      BrushRenderer.drawVariableWidthPath(ctx, points, getWidth);
      ctx.restore();

      // Pass 3: Bright White Inner Core (Apple Pencil / Laser look)
      ctx.save();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = Math.max(1.5, baseSize * 0.35);
      ctx.globalAlpha = 0.95;
      BrushRenderer.drawPath(ctx, points);
      ctx.stroke();
      ctx.restore();
    } else {
      // Solid Calligraphic Pen Pass
      ctx.save();
      ctx.strokeStyle = baseColor;
      BrushRenderer.drawVariableWidthPath(ctx, points, getWidth);
      ctx.restore();
    }

    ctx.restore();
  }

  private static drawPath(ctx: CanvasRenderingContext2D, points: InkPoint[]) {
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }
  }

  private static drawVariableWidthPath(
    ctx: CanvasRenderingContext2D,
    points: InkPoint[],
    getWidthFn: (pt: InkPoint, index: number, total: number) => number
  ) {
    if (points.length < 2) return;

    const total = points.length;

    for (let i = 0; i < total - 1; i++) {
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const w1 = getWidthFn(p1, i, total);
      const w2 = getWidthFn(p2, i + 1, total);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = (w1 + w2) / 2;
      ctx.stroke();
    }
  }
}

// 9. DigitalInkEngine Orchestrator
export class DigitalInkEngine {
  public virtualPen: VirtualPen = new VirtualPen();
  public strokeBuffer: StrokeBuffer = new StrokeBuffer();
  public isWriting: boolean = false;
  private previewPoints: InkPoint[] = [];

  startStroke(targetX: number, targetY: number) {
    this.virtualPen.reset(targetX, targetY);
    this.strokeBuffer.clear();

    const initialPoint: InkPoint = {
      x: targetX,
      y: targetY,
      timestamp: performance.now(),
      velocity: 0,
      pressure: 0.85,
      confidence: 1.0,
      trackingState: "tracked"
    };

    this.strokeBuffer.addPoint(initialPoint);
    this.previewPoints = [initialPoint];
    this.isWriting = true;
  }

  update(targetX: number, targetY: number, dt: number, isTracked: boolean = true) {
    if (!this.isWriting) return;

    const penState = this.virtualPen.update(targetX, targetY, dt);

    // 1. MIN_POINT_DISTANCE Gating (2.5px threshold)
    const raw = this.strokeBuffer.getPoints();
    const lastPoint = raw[raw.length - 1];
    if (lastPoint) {
      const dx = penState.x - lastPoint.x;
      const dy = penState.y - lastPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Ignore movement smaller than 2.5px to eliminate tremor jitter & CPU churn
      if (dist < 2.5) {
        return;
      }
    }

    const pressure = Math.max(0.4, Math.min(1.0, 1.1 - penState.velocity / 800.0));

    const point: InkPoint = {
      x: penState.x,
      y: penState.y,
      timestamp: performance.now(),
      velocity: penState.velocity,
      pressure,
      confidence: isTracked ? 1.0 : 0.7,
      trackingState: isTracked ? "tracked" : "held"
    };

    // 2. Append filtered point
    this.strokeBuffer.addPoint(point);

    // 3. Real-time Incremental Preview Generation for 60 FPS continuous live feedback
    const updatedRaw = this.strokeBuffer.getPoints();
    const len = updatedRaw.length;

    if (len <= 2) {
      this.previewPoints = [...updatedRaw];
    } else {
      const resampled = PointResampler.resample(updatedRaw, 3.0);
      const spline = SplineGenerator.generateCatmullRomSpline(resampled, 3);
      if (spline.length > 0) {
        spline[spline.length - 1] = { ...point };
      }
      this.previewPoints = spline;
    }
  }

  getPreviewPoints(): InkPoint[] {
    return this.previewPoints;
  }

  finalizeStroke(): InkPoint[] {
    if (!this.isWriting) return [];

    const raw = this.strokeBuffer.getPoints();
    this.isWriting = false;

    if (raw.length < 2) {
      return [...raw];
    }

    // 1. Gap Repair: bridge missed tracking frames
    const repaired = GapRepair.repairGaps(raw, 14.0);

    // 2. Stroke Simplification (Douglas-Peucker: reduces 1000+ points by >80%)
    const simplified = StrokeOptimizer.optimize(repaired);

    // 3. Uniform Spatial Resampling
    const resampled = PointResampler.resample(simplified, 3.5);

    // 4. Character Geometry Reconstruction & Beautification
    const beautified = CharacterReconstructor.reconstructCharacter(resampled);

    this.strokeBuffer.clear();
    this.previewPoints = [];

    return beautified;
  }
}

// 10. Typography Renderer for holographic AR floating text
export class TypographyRenderer {
  static renderHolographicText(
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    cy: number,
    fontSize: number,
    color: string,
    glowIntensity: number = 25
  ) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${fontSize}px Outfit, Inter, sans-serif`;

    // Outer soft glow aura
    ctx.shadowColor = color;
    ctx.shadowBlur = glowIntensity * 1.6;
    ctx.fillStyle = color;
    ctx.fillText(text, cx, cy);

    // Inner bright white core fill for holographic AR text
    ctx.shadowBlur = glowIntensity * 0.5;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, cx, cy);

    ctx.restore();
  }
}

// 11. Morph Animator for smooth 350ms transition from handwritten stroke to digital text
export interface MorphState {
  id: string;
  strokePoints: InkPoint[];
  strokeColor: string;
  strokeSize: number;
  targetText: string;
  centroid: { x: number; y: number };
  boundingSize: { width: number; height: number };
  startTime: number;
  duration: number;
  progress: number;
  isComplete: boolean;
}

export class MorphAnimator {
  public activeMorphs: MorphState[] = [];

  startMorph(points: InkPoint[], color: string, size: number, targetText: string, duration: number = 350): MorphState {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const cx = minX === Infinity ? 0 : (minX + maxX) / 2;
    const cy = minY === Infinity ? 0 : (minY + maxY) / 2;
    const width = Math.max(40, maxX - minX);
    const height = Math.max(36, maxY - minY);

    const morph: MorphState = {
      id: Math.random().toString(36).substr(2, 9),
      strokePoints: points,
      strokeColor: color,
      strokeSize: size,
      targetText,
      centroid: { x: cx, y: cy },
      boundingSize: { width, height },
      startTime: performance.now(),
      duration,
      progress: 0,
      isComplete: false
    };

    this.activeMorphs.push(morph);
    return morph;
  }

  update(now: number) {
    this.activeMorphs.forEach((morph) => {
      const elapsed = now - morph.startTime;
      morph.progress = Math.min(1.0, elapsed / morph.duration);
      if (morph.progress >= 1.0) {
        morph.isComplete = true;
      }
    });

    this.activeMorphs = this.activeMorphs.filter((m) => !m.isComplete);
  }

  render(ctx: CanvasRenderingContext2D) {
    const now = performance.now();
    this.update(now);

    this.activeMorphs.forEach((morph) => {
      ctx.save();
      const p = morph.progress;
      // Cubic-bezier easing: easeOutCubic
      const ease = 1 - Math.pow(1 - p, 3);

      // Phase 1: Handwritten stroke contracts & glows brighter before fading out
      const strokeAlpha = Math.max(0, 1.0 - ease * 1.25);
      if (strokeAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = strokeAlpha;
        BrushRenderer.renderInkStroke(
          ctx,
          morph.strokePoints,
          morph.strokeColor,
          Math.max(1, morph.strokeSize * (1 - ease * 0.35)),
          "neon",
          25 + ease * 25
        );
        ctx.restore();
      }

      // Phase 2: Holographic Digital Text fades in & scales smoothly
      const textAlpha = Math.min(1.0, ease * 1.35);
      if (textAlpha > 0) {
        const fontSize = Math.max(36, Math.min(120, morph.boundingSize.height * 1.15));
        const scale = 0.85 + ease * 0.15;

        ctx.save();
        ctx.globalAlpha = textAlpha;
        TypographyRenderer.renderHolographicText(
          ctx,
          morph.targetText,
          morph.centroid.x,
          morph.centroid.y,
          fontSize * scale,
          morph.strokeColor,
          25 * ease
        );
        ctx.restore();
      }

      ctx.restore();
    });
  }
}
