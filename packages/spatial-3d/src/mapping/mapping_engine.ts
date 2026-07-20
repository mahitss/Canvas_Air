import { Vector3 } from "../types";

export interface SpatialSurface {
  id: string;
  type: "plane" | "mesh" | "boundary" | "obstacle";
  vertices: Vector3[];
  normal?: Vector3;
}

export class SpatialMappingEngine {
  private readonly surfaces = new Map<string, SpatialSurface>();

  /**
   * Updates or registers real-world surface plane bounds coordinates.
   */
  public updateSurface(surface: SpatialSurface): void {
    this.surfaces.set(surface.id, { ...surface });
  }

  public getSurfaces(): SpatialSurface[] {
    return Array.from(this.surfaces.values());
  }

  public removeSurface(id: string): void {
    this.surfaces.delete(id);
  }

  public clear(): void {
    this.surfaces.clear();
  }
}
