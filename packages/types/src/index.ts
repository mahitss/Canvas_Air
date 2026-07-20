export type GestureType = 
  | "PINCH_START"
  | "PINCH_END"
  | "SWIPE_LEFT"
  | "SWIPE_RIGHT"
  | "SWIPE_UP"
  | "SWIPE_DOWN"
  | "HOLD"
  | "DRAW"
  | "HOVER";

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface HandLandmark {
  label: "Left" | "Right";
  score: number;
  landmarks: Point3D[];
}

export interface GestureEvent {
  id: string;
  type: GestureType;
  confidence: number;
  origin: Point3D;
  timestamp: number;
}

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  type: "vector" | "raster" | "3d";
}

export interface SyncPacket {
  seq: number;
  timestamp: number;
  userId: string;
  roomId: string;
  payloadType: "gesture" | "stroke_draw" | "stroke_clear" | "layer_toggle";
  payload: ArrayBuffer | string;
}
