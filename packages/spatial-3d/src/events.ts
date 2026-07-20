export type SpatialEventType =
  | "SessionStarted"
  | "SessionSuspended"
  | "AnchorCreated"
  | "AnchorRelocated"
  | "CoordinatesCalibrated"
  | "SessionFailed"
  | "DeviceConnected"
  | "MappingUpdated"
  | "DepthUpdated"
  | "WorldStateChanged"
  | "SynchronizationCompleted"
  | "ProcessingFailed";

export interface SpatialComputingEvent {
  type: SpatialEventType;
  payload: any;
  timestamp: number;
}

