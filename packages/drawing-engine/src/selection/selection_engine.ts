export type SelectionMode = "Point" | "Pinch" | "Lasso" | "Rectangle" | "Hover";

export interface CanvasObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked?: boolean;
}

export class SelectionEngine {
  private selectedIds: string[] = [];
  private hoveredId: string | null = null;

  /**
   * Identifies intersected bounding regions or target coordinates matching selection gestures.
   */
  public evaluateSelection(objects: CanvasObject[], selectX: number, selectY: number, mode: SelectionMode): string[] {
    const matched: string[] = [];

    for (const obj of objects) {
      const isInside =
        selectX >= obj.x &&
        selectX <= obj.x + obj.width &&
        selectY >= obj.y &&
        selectY <= obj.y + obj.height;

      if (isInside) {
        if (mode === "Hover") {
          this.hoveredId = obj.id;
        }
        matched.push(obj.id);
      }
    }

    if (mode !== "Hover") {
      this.selectedIds = matched;
    }

    return matched;
  }

  public selectMultiple(ids: string[]): void {
    this.selectedIds = [...ids];
  }

  public getSelectedIds(): string[] {
    return this.selectedIds;
  }

  public getHoveredId(): string | null {
    return this.hoveredId;
  }

  public clearSelection(): void {
    this.selectedIds = [];
    this.hoveredId = null;
  }
}
