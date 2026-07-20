import { DetectedObject, SceneGraph, SegmentationMask, ObjectTrajectory } from "./types";

export interface NormalizedInput {
  id: string;
  sourceType: "image" | "frame" | "stream" | "batch";
  width: number;
  height: number;
  pixelData: ArrayBuffer | string;
  timestamp: number;
}

export interface SpatialRelationship {
  sourceId: string;
  targetId: string;
  relation: "left-of" | "right-of" | "above" | "below" | "inside" | "contains" | "overlaps" | "adjacent";
  confidence: number;
}

export interface StructuredSceneModel {
  id: string;
  timestamp: number;
  detectedObjects: DetectedObject[];
  segmentationMasks: SegmentationMask[];
  trajectories: ObjectTrajectory[];
  spatialRelationships: SpatialRelationship[];
  sceneGraph: SceneGraph;
}
