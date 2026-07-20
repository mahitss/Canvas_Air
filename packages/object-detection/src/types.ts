export interface DetectedObject {
  id: string;
  trackingId?: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SegmentationMask {
  objectId: string;
  contourPoints: { x: number; y: number }[];
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface ObjectTrajectory {
  trackingId: string;
  label: string;
  path: TrajectoryPoint[];
}

export interface SceneNode {
  id: string;
  trackingId?: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RelationType = "overlap" | "containment" | "adjacency";

export interface SceneRelationship {
  fromId: string;
  toId: string;
  type: RelationType;
}

export interface SceneGraph {
  nodes: SceneNode[];
  relationships: SceneRelationship[];
}

export interface DetectionModelProvider {
  id: string;
  name: string;
  detect(imageUri: string): Promise<DetectedObject[]>;
}
