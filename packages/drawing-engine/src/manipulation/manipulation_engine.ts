import { CanvasObject } from "../selection/selection_engine";

export interface GroupDefinition {
  groupId: string;
  objectIds: string[];
}

export class ManipulationEngine {
  private readonly groups = new Map<string, GroupDefinition>();

  /**
   * Applies spatial matrix translations (scaling rotations offsets) on elements.
   */
  public moveObject(obj: CanvasObject, dx: number, dy: number): void {
    if (obj.locked) return;
    obj.x += dx;
    obj.y += dy;
  }

  public scaleObject(obj: CanvasObject, factor: number): void {
    if (obj.locked) return;
    obj.width *= factor;
    obj.height *= factor;
  }

  public groupObjects(groupId: string, ids: string[]): void {
    this.groups.set(groupId, { groupId, objectIds: ids });
  }

  public ungroupObjects(groupId: string): void {
    this.groups.delete(groupId);
  }

  public duplicateObject(obj: CanvasObject): CanvasObject {
    return {
      ...obj,
      id: `${obj.id}-copy-${Math.random().toString(36).substr(2, 5)}`,
      x: obj.x + 20,
      y: obj.y + 20
    };
  }

  public getGroups(): Map<string, GroupDefinition> {
    return this.groups;
  }
}
export * from "../selection/selection_engine";
