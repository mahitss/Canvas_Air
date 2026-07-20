import { HandPresence } from "@visioncanvas/hand-tracking";
import { IGestureProvider } from "../interfaces";
import { GesturePresence } from "../types";
import { RingBuffer } from "../optimized-engine";

export interface DynamicGestureConfig {
  minHistoryWindow: number;         // Minimum frames required (default: 5)
  maxHistoryWindow: number;         // Maximum frames in sliding window (default: 20)
  maxHistoryAgeMs: number;          // Maximum age of history entries (default: 600)
  swipeVelocityThreshold: number;   // Coordinate units per second to trigger swipe (default: 0.25)
  zoomDistanceThreshold: number;    // Delta distance between index and thumb tip to trigger Zoom (default: 0.04)
  rotateAngleThreshold: number;     // Delta angle in radians between index/thumb to trigger Rotate (default: 0.4)
  circleRadiusVarianceThreshold: number; // Ratio of stddev to radius to qualify as circular (default: 0.25)
}

interface LandmarkSample {
  timestamp: number;
  wrist: { x: number; y: number; z: number };
  indexTip: { x: number; y: number; z: number };
  thumbTip: { x: number; y: number; z: number };
}

/**
 * Temporal, rule-based Dynamic Gesture Provider optimized with pre-allocated RingBuffers.
 * Detects Swipes (Left/Right/Up/Down), Circle, Zoom In/Out, and Rotate.
 */
export class DynamicGestureProvider implements IGestureProvider {
  public readonly name = "DynamicGestureProvider";
  private readonly historyMap: Map<string, RingBuffer<LandmarkSample>> = new Map();

  constructor(
    private readonly config: DynamicGestureConfig = {
      minHistoryWindow: 5,
      maxHistoryWindow: 20,
      maxHistoryAgeMs: 600,
      swipeVelocityThreshold: 0.25,
      zoomDistanceThreshold: 0.04,
      rotateAngleThreshold: 0.4,
      circleRadiusVarianceThreshold: 0.25
    }
  ) {}

  public async detect(hand: HandPresence): Promise<GesturePresence | null> {
    const lms = hand.landmarks;
    const wrist = lms.wrist;
    const indexTip = lms.index_tip;
    const thumbTip = lms.thumb_tip;

    if (!wrist || !indexTip || !thumbTip) {
      return null;
    }

    const now = hand.timestamp;
    let buffer = this.historyMap.get(hand.id);
    if (!buffer) {
      buffer = new RingBuffer<LandmarkSample>(this.config.maxHistoryWindow);
      this.historyMap.set(hand.id, buffer);
    }

    buffer.push({
      timestamp: now,
      wrist: { x: wrist.x, y: wrist.y, z: wrist.z },
      indexTip: { x: indexTip.x, y: indexTip.y, z: indexTip.z },
      thumbTip: { x: thumbTip.x, y: thumbTip.y, z: thumbTip.z }
    });

    // Prune stale samples dynamically without allocating new arrays
    let firstIdx = 0;
    const len = buffer.getLength();
    while (firstIdx < len) {
      const sample = buffer.get(firstIdx);
      if (sample && now - sample.timestamp <= this.config.maxHistoryAgeMs) {
        break;
      }
      firstIdx++;
    }

    const activeCount = len - firstIdx;
    if (activeCount < this.config.minHistoryWindow) {
      return null;
    }

    const first = buffer.get(firstIdx)!;
    const last = buffer.get(len - 1)!;
    const dt = (last.timestamp - first.timestamp) / 1000;
    if (dt <= 0) return null;

    const dx = last.indexTip.x - first.indexTip.x;
    const dy = last.indexTip.y - first.indexTip.y;

    const distance = (p1: any, p2: any) => {
      const adx = p1.x - p2.x;
      const ady = p1.y - p2.y;
      const adz = p1.z - p2.z;
      return Math.sqrt(adx * adx + ady * ady + adz * adz);
    };

    const indexVelocity = distance(last.indexTip, first.indexTip) / dt;

    let gestureName = "";
    let confidence = 0.8;

    // 1. Zoom Detection
    const firstPinchDist = distance(first.indexTip, first.thumbTip);
    const lastPinchDist = distance(last.indexTip, last.thumbTip);
    const distDelta = lastPinchDist - firstPinchDist;

    if (Math.abs(distDelta) > this.config.zoomDistanceThreshold) {
      gestureName = distDelta > 0 ? "Zoom In" : "Zoom Out";
      confidence = Math.min(1.0, Math.abs(distDelta) / (this.config.zoomDistanceThreshold * 2) + 0.5);
    }
    // 2. Rotate Detection
    else {
      const firstAngle = Math.atan2(first.indexTip.y - first.thumbTip.y, first.indexTip.x - first.thumbTip.x);
      const lastAngle = Math.atan2(last.indexTip.y - last.thumbTip.y, last.indexTip.x - last.thumbTip.x);
      let angleDelta = lastAngle - firstAngle;

      if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
      if (angleDelta <= -Math.PI) angleDelta += 2 * Math.PI;

      if (Math.abs(angleDelta) > this.config.rotateAngleThreshold) {
        gestureName = "Rotate";
        confidence = Math.min(1.0, Math.abs(angleDelta) / (this.config.rotateAngleThreshold * 2) + 0.5);
      }
      // 3. Circle & Swipe Detection
      else {
        let cx = 0;
        let cy = 0;
        for (let i = firstIdx; i < len; i++) {
          const sample = buffer.get(i)!;
          cx += sample.indexTip.x;
          cy += sample.indexTip.y;
        }
        cx /= activeCount;
        cy /= activeCount;

        let sumRadius = 0;
        const radii: number[] = [];
        for (let i = firstIdx; i < len; i++) {
          const sample = buffer.get(i)!;
          const r = Math.sqrt((sample.indexTip.x - cx) ** 2 + (sample.indexTip.y - cy) ** 2);
          sumRadius += r;
          radii.push(r);
        }
        const avgRadius = sumRadius / activeCount;

        let variance = 0;
        radii.forEach((r) => {
          variance += (r - avgRadius) ** 2;
        });
        const stdDev = Math.sqrt(variance / activeCount);

        let isCircle = false;
        if (avgRadius > 0.02 && stdDev / avgRadius < this.config.circleRadiusVarianceThreshold) {
          let totalSweep = 0;
          for (let i = firstIdx + 1; i < len; i++) {
            const prev = buffer.get(i - 1)!;
            const curr = buffer.get(i)!;
            const prevAng = Math.atan2(prev.indexTip.y - cy, prev.indexTip.x - cx);
            const currAng = Math.atan2(curr.indexTip.y - cy, curr.indexTip.x - cx);
            let diff = currAng - prevAng;
            if (diff > Math.PI) diff -= 2 * Math.PI;
            if (diff <= -Math.PI) diff += 2 * Math.PI;
            totalSweep += diff;
          }

          if (Math.abs(totalSweep) > 3.5) {
            gestureName = "Circle";
            confidence = 0.85;
            isCircle = true;
          }
        }

        let pathLength = 0;
        for (let i = firstIdx + 1; i < len; i++) {
          const prev = buffer.get(i - 1)!;
          const curr = buffer.get(i)!;
          pathLength += distance(prev.indexTip, curr.indexTip);
        }
        const straightDist = distance(first.indexTip, last.indexTip);
        const linearity = pathLength > 0 ? straightDist / pathLength : 0;

        if (!isCircle && linearity > 0.85 && indexVelocity > this.config.swipeVelocityThreshold) {
          if (Math.abs(dx) > Math.abs(dy) * 1.5) {
            gestureName = dx > 0 ? "Swipe Right" : "Swipe Left";
            confidence = Math.min(1.0, indexVelocity / (this.config.swipeVelocityThreshold * 2) + 0.5);
          } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
            gestureName = dy > 0 ? "Swipe Down" : "Swipe Up";
            confidence = Math.min(1.0, indexVelocity / (this.config.swipeVelocityThreshold * 2) + 0.5);
          }
        }
      }
    }

    if (!gestureName) {
      return null;
    }

    buffer.clear();

    return {
      handId: hand.id,
      gesture: gestureName,
      confidence,
      state: "active",
      timestamp: hand.timestamp
    };
  }

  public clearHistory(handId: string): void {
    const buffer = this.historyMap.get(handId);
    if (buffer) {
      buffer.clear();
    }
  }
}
