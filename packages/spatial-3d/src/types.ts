export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type Matrix4 = Float32Array; // Array of size 16 representing column-major layout

export type NodeType3D = "mesh" | "group" | "light" | "camera";

export interface SceneNode3D {
  id: string;
  name: string;
  type: NodeType3D;
  parentId?: string;
  localMatrix: Matrix4;
  worldMatrix: Matrix4;
  boundingRadius?: number; // Used for collision checking
}

export interface SpatialAnchor {
  id: string;
  name: string;
  position: Vector3;
  orientation: Vector3; // Euler angles
  createdAt: number;
}

export interface Ray3D {
  origin: Vector3;
  direction: Vector3; // Must be normalized
}

export interface Scene3D {
  nodes: SceneNode3D[];
}

export interface Camera3D {
  fov: number;
  aspect: number;
  near: number;
  far: number;
  viewMatrix: Matrix4;
  projectionMatrix: Matrix4;
}
