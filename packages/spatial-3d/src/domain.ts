export interface SpatialSessionMetadata {
  sessionId: string;
  name: string;
  creatorId: string;
  participantIds: string[];
  createdAt: number;
  status: "active" | "suspended" | "closed";
}

export interface CoordinatePoint {
  x: number;
  y: number;
  z: number;
  precision: number;
}

export interface AnchorMetadata {
  anchorId: string;
  persistent: boolean;
  shared: boolean;
  notes: string | undefined;
}

export interface SpatialMap {
  mapId: string;
  anchorsCount: number;
  originPoint: CoordinatePoint;
}
