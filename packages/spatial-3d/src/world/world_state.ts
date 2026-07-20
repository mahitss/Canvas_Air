import { SpatialAnchor, SceneNode3D, Vector3 } from "../types";

export interface DeviceState {
  deviceId: string;
  batteryLevel: number;
  trackingLost: boolean;
}

export interface SharedWorldMetadata {
  sessionName: string;
  epochMs: number;
}

export interface WorldStateVersion {
  versionId: string;
  timestamp: number;
  anchors: SpatialAnchor[];
  objects: SceneNode3D[];
  userPositions: Map<string, Vector3>;
}

export class WorldStateManager {
  private currentVersion = 1;
  private readonly history: WorldStateVersion[] = [];
  private readonly activeUserPositions = new Map<string, Vector3>();
  private readonly activeDevices = new Map<string, DeviceState>();
  private metadata: SharedWorldMetadata = { sessionName: "Default MR Workspace", epochMs: Date.now() };

  public updateWorldMetadata(meta: SharedWorldMetadata): void {
    this.metadata = { ...meta };
  }

  public getWorldMetadata(): SharedWorldMetadata {
    return this.metadata;
  }

  public updateUserPosition(userId: string, pos: Vector3): void {
    this.activeUserPositions.set(userId, { ...pos });
  }

  public updateDeviceState(deviceId: string, state: DeviceState): void {
    this.activeDevices.set(deviceId, { ...state });
  }

  public getDeviceState(deviceId: string): DeviceState | null {
    return this.activeDevices.get(deviceId) || null;
  }

  public commitVersion(anchors: SpatialAnchor[], objects: SceneNode3D[]): string {
    const versionId = `v-${this.currentVersion++}`;
    const entry: WorldStateVersion = {
      versionId,
      timestamp: Date.now(),
      anchors: anchors.map(a => ({ ...a })),
      objects: objects.map(o => ({ ...o })),
      userPositions: new Map(this.activeUserPositions)
    };

    this.history.push(entry);
    if (this.history.length > 30) {
      this.history.shift();
    }
    return versionId;
  }

  public getHistory(): WorldStateVersion[] {
    return this.history;
  }
}
