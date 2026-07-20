import { SpatialAnchor } from "./types";
import { SpatialSessionMetadata, CoordinatePoint, AnchorMetadata } from "./domain";

export interface ISpatialDeviceProvider {
  id: string;
  name: string;
  type: "WebXR" | "VisionPro" | "MetaQuest" | "HoloLens" | "AndroidXR" | "Future";
  initialize(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  health(): Promise<"healthy" | "degraded" | "down">;
  dispose(): Promise<void>;
}

export interface ISpatialSessionManager {
  createSession(metadata: SpatialSessionMetadata): Promise<string>;
  resumeSession(sessionId: string): Promise<void>;
  suspendSession(sessionId: string): Promise<void>;
  restoreSession(sessionId: string): Promise<void>;
  getSessionMetadata(sessionId: string): SpatialSessionMetadata | null;
}

export interface ICoordinateEngine {
  toWorldCoordinates(local: CoordinatePoint, origin: CoordinatePoint): CoordinatePoint;
  toLocalCoordinates(world: CoordinatePoint, origin: CoordinatePoint): CoordinatePoint;
  calibrate(origin: CoordinatePoint, delta: CoordinatePoint): CoordinatePoint;
}

export interface IAnchorManager {
  createAnchor(anchor: SpatialAnchor, metadata: AnchorMetadata): Promise<void>;
  relocateAnchor(anchorId: string, newPosition: any): Promise<void>;
  deleteAnchor(anchorId: string): Promise<void>;
  getAnchorMetadata(anchorId: string): AnchorMetadata | null;
}
