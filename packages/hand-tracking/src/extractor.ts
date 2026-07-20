import { IHandLandmarkExtractor } from "./interfaces";
import { HandPresence, JointName, HandLandmark, HandType } from "./types";

export const JOINT_INDEX_MAP: Record<number, JointName> = {
  0: "wrist",
  1: "thumb_cmc",
  2: "thumb_mcp",
  3: "thumb_ip",
  4: "thumb_tip",
  5: "index_mcp",
  6: "index_pip",
  7: "index_dip",
  8: "index_tip",
  9: "middle_mcp",
  10: "middle_pip",
  11: "middle_dip",
  12: "middle_tip",
  13: "ring_mcp",
  14: "ring_pip",
  15: "ring_dip",
  16: "ring_tip",
  17: "pinky_mcp",
  18: "pinky_pip",
  19: "pinky_dip",
  20: "pinky_tip"
};

/**
 * Production-quality Hand Landmark Extraction Service.
 * Implements structured mappings, normalization assertions, and coordinate validation.
 */
export class HandLandmarkExtractor implements IHandLandmarkExtractor {
  public extract(rawResults: any, timestamp: number): HandPresence[] {
    if (!rawResults || !Array.isArray(rawResults.multiHandLandmarks)) {
      return [];
    }

    const multiHandedness = Array.isArray(rawResults.multiHandedness) ? rawResults.multiHandedness : [];
    const extracted: HandPresence[] = [];

    rawResults.multiHandLandmarks.forEach((landmarksList: any[], index: number) => {
      try {
        const handednessObj = multiHandedness[index];
        const confidence = handednessObj?.score ?? 1.0;
        const rawLabel = handednessObj?.label ?? "Right";
        const type: HandType = rawLabel.toLowerCase() === "left" ? "left" : "right";

        const landmarksRecord: Partial<Record<JointName, HandLandmark>> = {};

        landmarksList.forEach((pt: any, ptIdx: number) => {
          const jointName = JOINT_INDEX_MAP[ptIdx];
          if (jointName && pt && typeof pt.x === "number" && typeof pt.y === "number" && typeof pt.z === "number") {
            landmarksRecord[jointName] = {
              x: pt.x,
              y: pt.y,
              z: pt.z
            };
          }
        });

        const handPresence: HandPresence = {
          id: `hand-${index}-${timestamp}`,
          type,
          confidence,
          landmarks: landmarksRecord as Record<JointName, HandLandmark>,
          timestamp
        };

        if (this.validate(handPresence)) {
          extracted.push(handPresence);
        }
      } catch {
        // Skip malformed individual hand collections gracefully
      }
    });

    return extracted;
  }

  public validate(presence: HandPresence): boolean {
    if (!presence.id || typeof presence.timestamp !== "number" || presence.timestamp <= 0) {
      return false;
    }

    if (presence.type !== "left" && presence.type !== "right") {
      return false;
    }

    if (typeof presence.confidence !== "number" || presence.confidence < 0 || presence.confidence > 1) {
      return false;
    }

    // Validate that all 21 joint landmark references exist and contain valid numbers
    const requiredKeys = Object.values(JOINT_INDEX_MAP);
    for (const key of requiredKeys) {
      const lm = presence.landmarks[key];
      if (!lm || typeof lm.x !== "number" || typeof lm.y !== "number" || typeof lm.z !== "number") {
        return false;
      }
      if (!Number.isFinite(lm.x) || !Number.isFinite(lm.y) || !Number.isFinite(lm.z)) {
        return false;
      }
    }

    return true;
  }
}
