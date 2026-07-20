
/**
 * Normalized 3D coordinate point.
 */
export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

/**
 * Map representing finger joints names to landmark indexes.
 */
export type JointName =
  | "wrist"
  | "thumb_cmc" | "thumb_mcp" | "thumb_ip" | "thumb_tip"
  | "index_mcp" | "index_pip" | "index_dip" | "index_tip"
  | "middle_mcp" | "middle_pip" | "middle_dip" | "middle_tip"
  | "ring_mcp" | "ring_pip" | "ring_dip" | "ring_tip"
  | "pinky_mcp" | "pinky_pip" | "pinky_dip" | "pinky_tip";

export type HandType = "left" | "right";

/**
 * Representation of a single detected hand.
 */
export interface HandPresence {
  id: string;
  type: HandType;
  confidence: number;
  landmarks: Record<JointName, HandLandmark>;
  timestamp: number;
}

/**
 * Hand Tracking Engine Custom Error.
 */
export class HandTrackingError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "HandTrackingError";
  }
}

export class DetectionFailedError extends HandTrackingError {
  constructor(message: string) {
    super(message, "DETECTION_FAILED");
  }
}

export type HandTrackingEvent =
  | { type: "HandDetected"; payload: { hand: HandPresence; frameId: string } }
  | { type: "HandLost"; payload: { handId: string; timestamp: number } }
  | { type: "LandmarksUpdated"; payload: { hand: HandPresence; frameId: string } }
  | { type: "TrackingStarted"; payload: { timestamp: number } }
  | { type: "TrackingStopped"; payload: { timestamp: number } }
  | { type: "TrackingError"; payload: { error: Error; timestamp: number } };
