export type DetectionEventType =
  | "DetectionStarted"
  | "ObjectsDetected"
  | "SceneSegmented"
  | "ObjectsTracked"
  | "RelationshipsInferred"
  | "DetectionFailed";

export interface SceneUnderstandingEvent {
  type: DetectionEventType;
  payload: any;
  timestamp: number;
}
