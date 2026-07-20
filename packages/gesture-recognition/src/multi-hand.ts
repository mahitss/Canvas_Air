import { HandPresence } from "@visioncanvas/hand-tracking";
import { IMultiHandGestureEngine } from "./interfaces";
import { GestureEvent } from "./types";
import { RingBuffer } from "./optimized-engine";

export interface MultiHandConfig {
  maxAgeMs: number;
  minSamples: number;
  pinchDistanceThreshold: number; // For two-hand pinch (inner finger pinch)
  expandThreshold: number;        // Change in distance between hands to qualify as expand
  rotateThreshold: number;        // Change in angle to qualify as rotate (radians)
  mirrorVelocityThreshold: number; // Opposing speed to count as mirror (units/sec)
  symmetricVelocityThreshold: number; // Simultaneous same-direction speed
}

interface MultiHandSample {
  timestamp: number;
  leftWrist: { x: number; y: number; z: number };
  rightWrist: { x: number; y: number; z: number };
  leftIndexTip: { x: number; y: number; z: number };
  rightIndexTip: { x: number; y: number; z: number };
  leftThumbTip: { x: number; y: number; z: number };
  rightThumbTip: { x: number; y: number; z: number };
}

/**
 * Production-quality Multi-Hand Gesture Engine optimized with RingBuffers.
 * Synchronizes left and right hand tracking data to detect two-hand pinch, expand, rotate, mirror, and symmetric motions.
 */
export class MultiHandGestureEngine implements IMultiHandGestureEngine {
  private readonly subscribers: Set<(event: GestureEvent) => void> = new Set();
  private readonly history: RingBuffer<MultiHandSample>;

  constructor(
    private readonly config: MultiHandConfig = {
      maxAgeMs: 600,
      minSamples: 5,
      pinchDistanceThreshold: 0.05,
      expandThreshold: 0.04,
      rotateThreshold: 0.3,
      mirrorVelocityThreshold: 0.2,
      symmetricVelocityThreshold: 0.2
    }
  ) {
    this.history = new RingBuffer<MultiHandSample>(20);
  }

  public processHands(hands: HandPresence[]): void {
    const left = hands.find((h) => h.type === "left");
    const right = hands.find((h) => h.type === "right");

    // Handle one hand disappearing: clear history and exit
    if (!left || !right) {
      this.history.clear();
      return;
    }

    const now = left.timestamp; // Synchronize using frame timestamp

    const lWrist = left.landmarks.wrist;
    const rWrist = right.landmarks.wrist;
    const lIndex = left.landmarks.index_tip;
    const rIndex = right.landmarks.index_tip;
    const lThumb = left.landmarks.thumb_tip;
    const rThumb = right.landmarks.thumb_tip;

    if (!lWrist || !rWrist || !lIndex || !rIndex || !lThumb || !rThumb) {
      return;
    }

    this.history.push({
      timestamp: now,
      leftWrist: { x: lWrist.x, y: lWrist.y, z: lWrist.z },
      rightWrist: { x: rWrist.x, y: rWrist.y, z: rWrist.z },
      leftIndexTip: { x: lIndex.x, y: lIndex.y, z: lIndex.z },
      rightIndexTip: { x: rIndex.x, y: rIndex.y, z: rIndex.z },
      leftThumbTip: { x: lThumb.x, y: lThumb.y, z: lThumb.z },
      rightThumbTip: { x: rThumb.x, y: rThumb.y, z: rThumb.z }
    });

    // Prune stale samples dynamically without allocating new arrays
    let firstIdx = 0;
    const len = this.history.getLength();
    while (firstIdx < len) {
      const sample = this.history.get(firstIdx);
      if (sample && now - sample.timestamp <= this.config.maxAgeMs) {
        break;
      }
      firstIdx++;
    }

    const activeCount = len - firstIdx;
    if (activeCount < this.config.minSamples) {
      return;
    }

    const first = this.history.get(firstIdx)!;
    const last = this.history.get(len - 1)!;
    const dt = (last.timestamp - first.timestamp) / 1000;
    if (dt <= 0) return;

    const distance = (p1: any, p2: any) => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dz = p1.z - p2.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    let detectedGesture = "";
    let confidence = 0.8;

    // 1. Two-hand Pinch: Check if both hands are in pinch state
    const leftPinchDist = distance(last.leftIndexTip, last.leftThumbTip);
    const rightPinchDist = distance(last.rightIndexTip, last.rightThumbTip);
    if (leftPinchDist < this.config.pinchDistanceThreshold && rightPinchDist < this.config.pinchDistanceThreshold) {
      detectedGesture = "Two-hand pinch";
      confidence = 0.95;
    }
    // 2. Mirror / Symmetric Detection
    else {
      const ldx = last.leftWrist.x - first.leftWrist.x;
      const rdx = last.rightWrist.x - first.rightWrist.x;
      const lvx = ldx / dt;
      const rvx = rdx / dt;

      if (Math.abs(lvx) > this.config.mirrorVelocityThreshold && Math.abs(rvx) > this.config.mirrorVelocityThreshold) {
        if (lvx * rvx < 0) { // Opposite directions
          detectedGesture = "Mirror";
          confidence = 0.85;
        } else { // Same direction
          detectedGesture = "Symmetric gestures";
          confidence = 0.85;
        }
      }
      // 3. Expand / Contract Detection
      else {
        const firstWristDist = distance(first.leftWrist, first.rightWrist);
        const lastWristDist = distance(last.leftWrist, last.rightWrist);
        const wristDistDelta = lastWristDist - firstWristDist;

        if (Math.abs(wristDistDelta) > this.config.expandThreshold) {
          detectedGesture = wristDistDelta > 0 ? "Expand" : "Contract";
          confidence = 0.9;
        }
        // 4. Rotate Detection: Line connecting both wrists angle changes
        else {
          const firstAngle = Math.atan2(first.rightWrist.y - first.leftWrist.y, first.rightWrist.x - first.leftWrist.x);
          const lastAngle = Math.atan2(last.rightWrist.y - last.leftWrist.y, last.rightWrist.x - last.leftWrist.x);
          let angleDelta = lastAngle - firstAngle;
          if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
          if (angleDelta <= -Math.PI) angleDelta += 2 * Math.PI;

          if (Math.abs(angleDelta) > this.config.rotateThreshold) {
            detectedGesture = "Rotate";
            confidence = 0.9;
          }
        }
      }
    }

    if (detectedGesture) {
      // Reset history to prevent duplicate triggers
      this.history.clear();
      this.emit({
        type: "MultiHandGestureDetected",
        payload: {
          gesture: detectedGesture,
          confidence,
          handIds: [left.id, right.id],
          timestamp: now
        }
      });
    }
  }

  public subscribe(callback: (event: GestureEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public unsubscribeAll(): void {
    this.subscribers.clear();
  }

  private emit(event: GestureEvent): void {
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch {
        // Suppress target failures
      }
    }
  }
}
