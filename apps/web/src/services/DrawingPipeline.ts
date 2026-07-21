import { DigitalInkEngine, BrushRenderer, MorphAnimator } from "./DigitalInkEngine";

// 1. One Euro Filter with dynamic parameter setters
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private lastValue: number | null = null;
  private lastDeriv: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.008, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  setParameters(minCutoff: number, beta: number) {
    this.minCutoff = minCutoff;
    this.beta = beta;
  }

  filter(value: number, timestamp: number): number {
    if (this.lastValue === null) {
      this.lastValue = value;
      this.lastDeriv = 0;
      return value;
    }

    const dt = timestamp || 0.016;
    const deriv = (value - this.lastValue) / dt;
    
    const alphaD = this.calculateAlpha(dt, this.dCutoff);
    const filteredDeriv = alphaD * deriv + (1 - alphaD) * (this.lastDeriv ?? 0);
    this.lastDeriv = filteredDeriv;

    const cutoff = this.minCutoff + this.beta * Math.abs(filteredDeriv);
    const alpha = this.calculateAlpha(dt, cutoff);
    const filteredValue = alpha * value + (1 - alpha) * this.lastValue;
    this.lastValue = filteredValue;

    return filteredValue;
  }

  reset() {
    this.lastValue = null;
    this.lastDeriv = null;
  }

  private calculateAlpha(dt: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }
}

// 1b. Kalman Filter for spatial landmark tracking
export class KalmanFilter {
  private x: number = 0;
  private p: number = 1;
  private q: number = 0.05;
  private r: number = 0.8;
  private k: number = 0;
  private initialized = false;

  filter(measurement: number): number {
    if (!this.initialized) {
      this.x = measurement;
      this.initialized = true;
      return measurement;
    }
    this.p = this.p + this.q;
    this.k = this.p / (this.p + this.r);
    this.x = this.x + this.k * (measurement - this.x);
    this.p = (1 - this.k) * this.p;
    return this.x;
  }

  reset() {
    this.initialized = false;
    this.p = 1;
  }
}

// 1c. Exponential Moving Average (EMA) Filter
export class EMAFilter {
  private alpha: number;
  private lastValue: number | null = null;

  constructor(alpha = 0.35) {
    this.alpha = alpha;
  }

  filter(value: number): number {
    if (this.lastValue === null) {
      this.lastValue = value;
      return value;
    }
    this.lastValue = this.alpha * value + (1 - this.alpha) * this.lastValue;
    return this.lastValue;
  }

  reset() {
    this.lastValue = null;
  }
}

export interface Stroke {
  points: Array<{ x: number; y: number }>;
  rawPoints?: Array<{ x: number; y: number }> | undefined;
  isSmartWriting?: boolean | undefined;
  color: string;
  size: number;
  glowIntensity: number;
  effect: "neon" | "solid";
  tool: "pen" | "eraser" | "line" | "rect" | "circle" | "text";
  text?: string | undefined;
  fadeStart?: number; // Smooth fade-in animation timestamp
}

// 2. CameraManager for webcam streams
export class CameraManager {
  private video: HTMLVideoElement;
  private stream: MediaStream | null = null;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  async start(width = 640, height = 480, fps = 30): Promise<MediaStream> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: fps }
      }
    });
    this.video.srcObject = this.stream;
    
    await new Promise<void>((resolve) => {
      this.video.onloadedmetadata = () => resolve();
    });
    
    await this.video.play();
    return this.stream;
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}

// 3. MediaPipeTracker for HandLandmarker model loading and inference
export class MediaPipeTracker {
  private landmarker: any = null;
  private isInitializing = false;

  async init(onStatus?: (msg: string) => void): Promise<void> {
    if (this.landmarker) return;
    if (this.isInitializing) return;
    this.isInitializing = true;

    if (onStatus) onStatus("Loading HandLandmarker...");
    
    // Dynamic import to bypass Next.js SSR build checks
    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm"
    );
    
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.62,
      minHandPresenceConfidence: 0.62,
      minTrackingConfidence: 0.62
    });
    this.isInitializing = false;
  }

  detect(video: HTMLVideoElement, timestamp: number): any {
    if (!this.landmarker) return null;
    return this.landmarker.detectForVideo(video, timestamp);
  }
}

// 4. HandManager for Left/Right hand differentiation and smoothing
export class HandManager {
  private filterX = new OneEuroFilter(0.85, 0.015, 1.0);
  private filterY = new OneEuroFilter(0.85, 0.015, 1.0);

  public rightHandLandmarks: any[] | null = null;
  public leftHandLandmarks: any[] | null = null;

  // Transient Tracking Drop Freeze-and-Hold buffers
  private lastValidPhysicalRight: any[] | null = null;
  private lastValidPhysicalLeft: any[] | null = null;
  private lossTimeRight: number | null = null;
  private lossTimeLeft: number | null = null;

  // Fingertip prediction velocity indicators
  private lastRawX: number | null = null;
  private lastRawY: number | null = null;
  private velX = 0;
  private velY = 0;
  private isPredictionEnabled = true;

  // Auto detect state tracker
  private autoLockedHand: "physical_right" | "physical_left" | null = null;

  setSmoothing(smoothing: number) {
    let minCutoff = 0.85;
    let beta = 0.015;
    
    if (smoothing < 65) {
      const t = smoothing / 65;
      minCutoff = 8.0 - t * (8.0 - 0.85);
      beta = 0.1 - t * (0.1 - 0.015);
    } else {
      const t = (smoothing - 65) / 35;
      minCutoff = 0.85 - t * (0.85 - 0.05);
      beta = 0.015 - t * (0.015 - 0.001);
    }
    
    this.filterX.setParameters(minCutoff, beta);
    this.filterY.setParameters(minCutoff, beta);
  }

  resetSmoothing() {
    this.filterX.reset();
    this.filterY.reset();
    this.lastRawX = null;
    this.lastRawY = null;
    this.velX = 0;
    this.velY = 0;
  }

  setPredictionEnabled(enabled: boolean) {
    this.isPredictionEnabled = enabled;
  }

  update(results: any, mode: "right" | "left" | "auto", canvasWidth: number, canvasHeight: number) {
    this.rightHandLandmarks = null;
    this.leftHandLandmarks = null;

    let physicalRightLandmarks: any[] | null = null;
    let physicalLeftLandmarks: any[] | null = null;

    if (results && results.landmarks && results.landmarks.length > 0) {
      for (let i = 0; i < results.landmarks.length; i++) {
        const landmarks = results.landmarks[i];
        const handedness = results.handednesses[i];
        if (landmarks && handedness) {
          const label = handedness[0].categoryName; // "Left" or "Right"
          
          if (label === "Right") {
            physicalRightLandmarks = landmarks; // User's physical right hand
          } else if (label === "Left") {
            physicalLeftLandmarks = landmarks; // User's physical left hand
          }
        }
      }
    }

    const now = performance.now();

    // Apply Freeze-and-Hold on Transient Right Hand Tracking Drops (brief 300ms freeze)
    if (physicalRightLandmarks) {
      this.lastValidPhysicalRight = physicalRightLandmarks;
      this.lossTimeRight = null;
    } else if (this.lastValidPhysicalRight) {
      if (this.lossTimeRight === null) {
        this.lossTimeRight = now;
      }
      if (now - this.lossTimeRight < 300) {
        physicalRightLandmarks = this.lastValidPhysicalRight; // Freeze and hold last known position
      } else {
        this.lastValidPhysicalRight = null;
        this.lossTimeRight = null;
      }
    }

    // Apply Freeze-and-Hold on Transient Left Hand Tracking Drops (brief 300ms freeze)
    if (physicalLeftLandmarks) {
      this.lastValidPhysicalLeft = physicalLeftLandmarks;
      this.lossTimeLeft = null;
    } else if (this.lastValidPhysicalLeft) {
      if (this.lossTimeLeft === null) {
        this.lossTimeLeft = now;
      }
      if (now - this.lossTimeLeft < 300) {
        physicalLeftLandmarks = this.lastValidPhysicalLeft; // Freeze and hold last known position
      } else {
        this.lastValidPhysicalLeft = null;
        this.lossTimeLeft = null;
      }
    }

    // If both hands completely lost and freeze windows exceeded, reset smoothing filters
    if (!physicalRightLandmarks && !physicalLeftLandmarks) {
      this.autoLockedHand = null;
      this.filterX.reset();
      this.filterY.reset();
      this.lastRawX = null;
      this.lastRawY = null;
      this.velX = 0;
      this.velY = 0;
      return;
    }

    // Determine target drawing hand based on mode
    let targetDrawing: "physical_right" | "physical_left" | null = null;

    if (mode === "right") {
      targetDrawing = "physical_right";
    } else if (mode === "left") {
      targetDrawing = "physical_left";
    } else {
      // Auto Detect mode
      if (this.autoLockedHand) {
        targetDrawing = this.autoLockedHand;
      } else {
        // No lock yet. The first hand that performs a valid pinch gesture (< 25px) becomes the drawing hand
        let rightPinch = false;
        let leftPinch = false;

        if (physicalRightLandmarks) {
          const dist = this.getLandmarksPinchDistance(physicalRightLandmarks, canvasWidth, canvasHeight);
          if (dist !== null && dist < 25) rightPinch = true;
        }
        if (physicalLeftLandmarks) {
          const dist = this.getLandmarksPinchDistance(physicalLeftLandmarks, canvasWidth, canvasHeight);
          if (dist !== null && dist < 25) leftPinch = true;
        }

        if (rightPinch && !leftPinch) {
          this.autoLockedHand = "physical_right";
          targetDrawing = "physical_right";
        } else if (leftPinch && !rightPinch) {
          this.autoLockedHand = "physical_left";
          targetDrawing = "physical_left";
        } else if (rightPinch && leftPinch) {
          this.autoLockedHand = "physical_right";
          targetDrawing = "physical_right";
        }
      }
    }

    // Assign landmarks based on target drawing hand
    if (targetDrawing === "physical_right") {
      this.rightHandLandmarks = physicalRightLandmarks;
      this.leftHandLandmarks = physicalLeftLandmarks;
    } else if (targetDrawing === "physical_left") {
      this.rightHandLandmarks = physicalLeftLandmarks;
      this.leftHandLandmarks = physicalRightLandmarks;
    } else {
      // Auto detect mode with no active lock yet.
      this.rightHandLandmarks = physicalRightLandmarks;
      this.leftHandLandmarks = physicalLeftLandmarks;
    }

    if (!this.rightHandLandmarks) {
      this.filterX.reset();
      this.filterY.reset();
      this.lastRawX = null;
      this.lastRawY = null;
      this.velX = 0;
      this.velY = 0;
    }
  }

  getSmoothedIndexTip(width: number, height: number, dt: number): { x: number; y: number } | null {
    if (!this.rightHandLandmarks) return null;
    const indexTip = this.rightHandLandmarks[8];
    if (!indexTip) return null;

    const rawX = (1 - indexTip.x) * width;
    const rawY = indexTip.y * height;

    const smoothX = this.filterX.filter(rawX, dt);
    const smoothY = this.filterY.filter(rawY, dt);

    // Calculate current velocity
    if (this.lastRawX !== null && this.lastRawY !== null) {
      const vx = (smoothX - this.lastRawX) / dt;
      const vy = (smoothY - this.lastRawY) / dt;
      // Low pass filter velocity to smooth prediction values
      this.velX = 0.15 * vx + 0.85 * this.velX;
      this.velY = 0.15 * vy + 0.85 * this.velY;
    }
    this.lastRawX = smoothX;
    this.lastRawY = smoothY;

    if (this.isPredictionEnabled) {
      // Predict 25ms forward into coordinate space to reduce perceived pipeline lag
      const predictionTime = 0.025;
      const predX = smoothX + this.velX * predictionTime;
      const predY = smoothY + this.velY * predictionTime;
      return { x: predX, y: predY };
    }

    return { x: smoothX, y: smoothY };
  }

  private getLandmarksPinchDistance(landmarks: any[], width: number, height: number): number | null {
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];
    if (!indexTip || !thumbTip) return null;

    const dx = (indexTip.x - thumbTip.x) * width;
    const dy = (indexTip.y - thumbTip.y) * height;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getPinchDistanceInPixels(width: number, height: number): number | null {
    if (!this.rightHandLandmarks) return null;
    return this.getLandmarksPinchDistance(this.rightHandLandmarks, width, height);
  }

  getAutoLockedHand(): "physical_right" | "physical_left" | null {
    return this.autoLockedHand;
  }

  resetAutoLock() {
    this.autoLockedHand = null;
  }
}

export function isAirPenGesture(landmarks: any[]): boolean {
  if (!landmarks || landmarks.length < 21) return false;

  const wrist = landmarks[0];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const middleTip = landmarks[12];
  const middlePip = landmarks[10];

  if (!wrist || !indexTip || !indexPip || !middleTip || !middlePip) {
    return false;
  }

  // Index finger extended from wrist relative to PIP joint
  const dWristIndexTip = Math.sqrt((indexTip.x - wrist.x) ** 2 + (indexTip.y - wrist.y) ** 2);
  const dWristIndexPip = Math.sqrt((indexPip.x - wrist.x) ** 2 + (indexPip.y - wrist.y) ** 2);
  const indexExtended = dWristIndexTip > dWristIndexPip * 1.08;

  // Middle finger is lower than index tip (relaxed pointing stance)
  const dWristMiddleTip = Math.sqrt((middleTip.x - wrist.x) ** 2 + (middleTip.y - wrist.y) ** 2);
  const middleLower = dWristMiddleTip < dWristIndexTip * 0.98;

  return indexExtended && middleLower;
}

// 5. GestureEngine for left-hand gestures
export class GestureEngine {
  private lastGesture = "unknown";
  private lastGestureTime = 0;

  classify(landmarks: any[]): string {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbBase = landmarks[2];
    const indexTip = landmarks[8];
    const indexBase = landmarks[5];
    const middleTip = landmarks[12];
    const middleBase = landmarks[9];
    const ringTip = landmarks[16];
    const ringBase = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyBase = landmarks[17];

    if (!wrist || !indexTip || !indexBase || !middleTip || !middleBase || !ringTip || !ringBase || !pinkyTip || !pinkyBase) {
      return "unknown";
    }

    const indexExtended = indexTip.y < indexBase.y;
    const middleExtended = middleTip.y < middleBase.y;
    const ringExtended = ringTip.y < ringBase.y;
    const pinkyExtended = pinkyTip.y < pinkyBase.y;

    const isFist = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
    if (isFist) return "fist";

    const isPeace = indexExtended && middleExtended && !ringExtended && !pinkyExtended;
    if (isPeace) return "peace";

    const isThumbsUp = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended && (thumbTip.y < thumbBase.y);
    if (isThumbsUp) return "thumbsup";

    const isOpenPalm = indexExtended && middleExtended && ringExtended && pinkyExtended;
    if (isOpenPalm) return "openpalm";

    return "unknown";
  }

  processGesture(landmarks: any[], onTrigger: (cmd: string) => void): string {
    const current = this.classify(landmarks);
    if (current !== this.lastGesture) {
      const now = Date.now();
      if (now - this.lastGestureTime > 600) {
        if (current === "fist" || current === "peace" || current === "thumbsup") {
          onTrigger(current);
          this.lastGestureTime = now;
        }
        this.lastGesture = current;
      }
    } else if (current === "unknown" || current === "openpalm") {
      this.lastGesture = current;
    }
    return current;
  }
}

// 6. StrokeEngine for point interpolation and stroke splitting
export class StrokeEngine {
  public strokes: Stroke[] = [];
  public redoStack: Stroke[] = [];
  public currentStroke: Stroke | null = null;
  private isDrawing = false;
  private digitalInkEngine = new DigitalInkEngine();

  startStroke(pt: { x: number; y: number }, settings: any) {
    console.log(`[StrokeEngine] startStroke() at (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`);
    this.redoStack = [];
    const coordinate = { x: pt.x, y: pt.y };
    
    this.digitalInkEngine.startStroke(coordinate.x, coordinate.y);
    const preview = this.digitalInkEngine.getPreviewPoints();

    this.currentStroke = {
      points: preview.length > 0 ? (preview as any) : [coordinate],
      rawPoints: [{ ...coordinate }],
      isSmartWriting: settings.isSmartWriting === true,
      color: settings.color,
      size: settings.size,
      glowIntensity: settings.glowIntensity,
      effect: settings.effect,
      tool: settings.tool,
      text: settings.tool === "text" ? settings.text : undefined
    };
    
    this.isDrawing = true;
  }

  addPoint(pt: { x: number; y: number }, settings: any) {
    if (!this.currentStroke) return;

    const coordinate = { x: pt.x, y: pt.y };

    if (settings.tool === "pen" || settings.tool === "eraser") {
      const dt = settings.dt || 0.016;
      this.digitalInkEngine.update(coordinate.x, coordinate.y, dt, true);
      const resampledSpline = this.digitalInkEngine.getPreviewPoints();
      if (resampledSpline.length > 0) {
        this.currentStroke.points = resampledSpline as any;
      } else {
        this.currentStroke.points.push(coordinate);
      }
    } else {
      // Shapes (line, rect, circle) overwrite end point
      this.currentStroke.points[1] = coordinate;
    }
  }

  endStroke(originalSettings?: any) {
    if (this.currentStroke) {
      if (this.currentStroke.tool === "pen" || this.currentStroke.tool === "eraser") {
        const finalizedSpline = this.digitalInkEngine.finalizeStroke();
        if (finalizedSpline.length > 0) {
          this.currentStroke.points = finalizedSpline as any;
        }
      }

      if (originalSettings) {
        this.currentStroke.effect = originalSettings.effect;
        this.currentStroke.glowIntensity = originalSettings.glowIntensity;
      }

      console.log(`[StrokeEngine] endStroke() committed with ${this.currentStroke.points.length} resampled spline points.`);
      this.strokes.push(this.currentStroke);
      this.currentStroke = null;
    }
    this.isDrawing = false;
  }

  undo(): boolean {
    if (this.strokes.length > 0) {
      const popped = this.strokes.pop()!;
      this.redoStack.push(popped);
      return true;
    }
    return false;
  }

  redo(): boolean {
    if (this.redoStack.length > 0) {
      const popped = this.redoStack.pop()!;
      this.strokes.push(popped);
      return true;
    }
    return false;
  }

  clear() {
    this.strokes = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.isDrawing = false;
  }

  getIsDrawing(): boolean {
    return this.isDrawing;
  }
}

// 7. Renderer for offscreen-canvas layered drawing and Catmull-Rom curves
export class Renderer {
  public morphAnimator: MorphAnimator = new MorphAnimator();
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    
    // Initialize offscreen cache canvas
    const dpr = window.devicePixelRatio || 1;
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvas.width = canvas.width;
    this.offscreenCanvas.height = canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext("2d");
    if (this.offscreenCtx) {
      this.offscreenCtx.scale(dpr, dpr);
    }
  }

  resize(width: number, height: number, customDpr?: number) {
    const dpr = customDpr || window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = width * dpr;
      this.offscreenCanvas.height = height * dpr;
      if (this.offscreenCtx) {
        this.offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.offscreenCtx.scale(dpr, dpr);
      }
    }
  }

  updateCache(strokes: Stroke[]) {
    if (!this.offscreenCanvas || !this.offscreenCtx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    this.offscreenCtx.clearRect(0, 0, width, height);
    strokes.forEach((stroke) => {
      // Skip fading strokes; they are drawn dynamically on frame renders
      if (stroke.fadeStart && Date.now() - stroke.fadeStart < 500) {
        return;
      }
      this.drawStroke(this.offscreenCtx!, stroke);
    });
  }

  renderFrame(
    activeStroke: Stroke | null,
    rightHand: any[] | null,
    leftHand: any[] | null,
    width: number,
    height: number,
    allStrokes: Stroke[] = []
  ) {
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = this.canvas.width / dpr;
    const canvasHeight = this.canvas.height / dpr;

    // 1. Clear main canvas
    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 2. Draw cached completed strokes (fast offscreen blit)
    if (this.offscreenCanvas) {
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
      this.ctx.restore();
    }

    // 2b. Draw fading strokes dynamically on the main canvas with custom alpha opacity
    allStrokes.forEach((stroke) => {
      if (stroke.fadeStart) {
        const elapsed = Date.now() - stroke.fadeStart;
        if (elapsed < 500) {
          const opacity = Math.min(1.0, elapsed / 500);
          this.ctx.save();
          this.ctx.globalAlpha = opacity;
          this.drawStroke(this.ctx, stroke);
          this.ctx.restore();
        } else {
          // Fade finished! Delete timestamp and commit to static offscreen cache
          delete stroke.fadeStart;
          this.updateCache(allStrokes);
        }
      }
    });

    // 3. Draw active stroke preview
    if (activeStroke) {
      this.drawStroke(this.ctx, activeStroke);
    }

    // 3b. Render active holographic morph transitions (handwriting -> digital text)
    this.morphAnimator.render(this.ctx);

    // 4. Draw Left Hand Skeleton (Gestures)
    if (leftHand) {
      this.drawSkeleton(this.ctx, leftHand, width, height, "rgba(244, 63, 94, 0.35)");
    }

    // 5. Draw Right Hand Skeleton (Drawing)
    if (rightHand) {
      this.drawSkeleton(this.ctx, rightHand, width, height, "rgba(16, 185, 129, 0.35)");
    }
  }

  drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length === 0) return;

    ctx.save();

    // Custom Digital Ink rendering for Smart Writing Mode
    if (stroke.isSmartWriting && stroke.tool === "pen") {
      BrushRenderer.renderInkStroke(
        ctx,
        stroke.points as any,
        stroke.color,
        stroke.size,
        stroke.effect,
        stroke.glowIntensity
      );
      ctx.restore();
      return;
    }
    
    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = stroke.size * 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    if (stroke.tool === "text") {
      const startPt = stroke.points[0]!;
      
      // Center-aligned text drawing
      ctx.font = `600 ${stroke.size * 3}px Outfit, sans-serif`;
      ctx.fillStyle = stroke.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      if (stroke.effect === "neon") {
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = stroke.glowIntensity * 1.5;
      }
      ctx.fillText(stroke.text || "Air Draw", startPt.x, startPt.y);
    } else if (stroke.tool === "pen" || stroke.tool === "eraser") {
      if (stroke.points.length < 2) {
        if (stroke.points.length === 1) {
          ctx.beginPath();
          const firstPt = stroke.points[0]!;
          ctx.arc(firstPt.x, firstPt.y, stroke.size / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke.tool === "eraser" ? "rgba(0,0,0,1)" : stroke.color;
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        const pts = stroke.points;
        ctx.moveTo(pts[0]!.x, pts[0]!.y);
        
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[i - 1]! || pts[i]!;
          const p1 = pts[i]!;
          const p2 = pts[i + 1]!;
          const p3 = pts[i + 2]! || p2;

          const steps = 6;
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
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
            ctx.lineTo(x, y);
          }
        }

        if (stroke.tool !== "eraser" && stroke.effect === "neon") {
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.size;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowBlur = stroke.glowIntensity;
          ctx.shadowColor = stroke.color;
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(1.5, stroke.size / 3.5);
          ctx.stroke();
        } else {
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.size;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }
      }
    } else if (stroke.tool === "line") {
      const startPt = stroke.points[0]!;
      const endPt = stroke.points[stroke.points.length - 1]! || startPt;
      ctx.beginPath();
      ctx.moveTo(startPt.x, startPt.y);
      ctx.lineTo(endPt.x, endPt.y);
      this.strokeAndGlow(ctx, stroke);
    } else if (stroke.tool === "rect") {
      const startPt = stroke.points[0]!;
      const endPt = stroke.points[stroke.points.length - 1]! || startPt;
      ctx.beginPath();
      ctx.rect(startPt.x, startPt.y, endPt.x - startPt.x, endPt.y - startPt.y);
      this.strokeAndGlow(ctx, stroke);
    } else if (stroke.tool === "circle") {
      const startPt = stroke.points[0]!;
      const endPt = stroke.points[stroke.points.length - 1]! || startPt;
      const radius = Math.sqrt((endPt.x - startPt.x) ** 2 + (endPt.y - startPt.y) ** 2);
      ctx.beginPath();
      ctx.arc(startPt.x, startPt.y, radius, 0, 2 * Math.PI);
      this.strokeAndGlow(ctx, stroke);
    }

    ctx.restore();
  }

  private strokeAndGlow(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.effect === "neon") {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.shadowBlur = stroke.glowIntensity;
      ctx.shadowColor = stroke.color;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1.5, stroke.size / 3.5);
      ctx.stroke();
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  drawSkeleton(ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number, color: string) {
    const HAND_CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
    ];

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 4;
    ctx.shadowColor = color;
    
    HAND_CONNECTIONS.forEach((conn) => {
      const i = conn[0]!;
      const j = conn[1]!;
      const ptA = landmarks[i];
      const ptB = landmarks[j];
      if (ptA && ptB) {
        ctx.beginPath();
        ctx.moveTo((1 - ptA.x) * width, ptA.y * height);
        ctx.lineTo((1 - ptB.x) * width, ptB.y * height);
        ctx.stroke();
      }
    });

    landmarks.forEach((lm, idx) => {
      ctx.beginPath();
      ctx.arc((1 - lm.x) * width, lm.y * height, 5, 0, 2 * Math.PI);
      
      if ([4, 8, 12, 16, 20].includes(idx)) {
        ctx.fillStyle = "#ffffff";
      } else {
        ctx.fillStyle = color.replace("0.35", "0.85");
      }
      
      ctx.shadowBlur = 8;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    });

    ctx.restore();
  }

  getSnapshotBase64(video: HTMLVideoElement): string {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = this.canvas.width;
    exportCanvas.height = this.canvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return "";

    // Draw mirrored video frame
    ctx.translate(exportCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, exportCanvas.width, exportCanvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw cached strokes
    if (this.offscreenCanvas) {
      ctx.drawImage(this.offscreenCanvas, 0, 0);
    }

    return exportCanvas.toDataURL("image/png");
  }
}
