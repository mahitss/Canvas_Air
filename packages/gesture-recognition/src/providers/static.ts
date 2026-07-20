import { HandPresence, JointName } from "@visioncanvas/hand-tracking";
import { IGestureProvider } from "../interfaces";
import { GesturePresence } from "../types";

export interface StaticGestureConfig {
  pinchThreshold: number;       // Distance between index tip and thumb tip to trigger Pinch/OK (default: 0.05)
  extendRatioThreshold: number; // Ratio of tip-wrist distance to pip-wrist distance to count as extended (default: 1.05)
}

/**
 * Geometric, rule-based Static Gesture Provider.
 * Detects Open Palm, Closed Fist, Point, Pinch, Peace, Thumbs Up, and OK Sign with configurable tolerances.
 */
export class StaticGestureProvider implements IGestureProvider {
  public readonly name = "StaticGestureProvider";

  constructor(
    private readonly config: StaticGestureConfig = {
      pinchThreshold: 0.05,
      extendRatioThreshold: 1.05
    }
  ) {}

  public async detect(hand: HandPresence): Promise<GesturePresence | null> {
    const lms = hand.landmarks;
    const wrist = lms.wrist;
    if (!wrist) return null;

    const distance = (p1: any, p2: any) => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dz = p1.z - p2.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    const isExtended = (pipName: JointName, tipName: JointName): boolean => {
      const pip = lms[pipName];
      const tip = lms[tipName];
      if (!pip || !tip) return false;
      return distance(tip, wrist) > distance(pip, wrist) * this.config.extendRatioThreshold;
    };

    // Evaluate fingers extension state
    const thumbExtended = isExtended("thumb_ip", "thumb_tip");
    const indexExtended = isExtended("index_pip", "index_tip");
    const middleExtended = isExtended("middle_pip", "middle_tip");
    const ringExtended = isExtended("ring_pip", "ring_tip");
    const pinkyExtended = isExtended("pinky_pip", "pinky_tip");

    const indexTip = lms.index_tip;
    const thumbTip = lms.thumb_tip;
    const indexMcp = lms.index_mcp;

    // Calculate index-thumb tip distance for Pinch and OK Sign
    let tipDistance = 999.0;
    if (indexTip && thumbTip) {
      tipDistance = distance(indexTip, thumbTip);
    }

    let gestureName = "";
    let confidence = 0.8;

    // OK Sign: Thumb and Index tips touch, Middle/Ring/Pinky extended
    if (tipDistance < this.config.pinchThreshold && middleExtended && ringExtended && pinkyExtended) {
      gestureName = "OK Sign";
      confidence = Math.max(0.5, 1.0 - tipDistance / this.config.pinchThreshold);
    }
    // Pinch: Thumb and Index tips touch, Middle/Ring/Pinky folded
    else if (tipDistance < this.config.pinchThreshold && !middleExtended && !ringExtended) {
      gestureName = "Pinch";
      confidence = Math.max(0.5, 1.0 - tipDistance / this.config.pinchThreshold);
    }
    // Open Palm: All fingers extended
    else if (thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
      gestureName = "Open Palm";
      confidence = 0.95;
    }
    // Closed Fist: All fingers folded
    else if (!thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      gestureName = "Closed Fist";
      confidence = 0.95;
    }
    // Peace: Index and Middle extended, Ring and Pinky folded
    else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      gestureName = "Peace";
      confidence = 0.9;
    }
    // Point: Only Index extended
    else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      gestureName = "Point";
      confidence = 0.9;
    }
    // Thumbs Up: Only Thumb extended (and pointing upward relative to index MCP)
    else if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      if (thumbTip && indexMcp && thumbTip.y < indexMcp.y) {
        gestureName = "Thumbs Up";
        confidence = 0.9;
      }
    }

    if (!gestureName) {
      return null;
    }

    return {
      handId: hand.id,
      gesture: gestureName,
      confidence,
      state: "active",
      timestamp: hand.timestamp
    };
  }
}
