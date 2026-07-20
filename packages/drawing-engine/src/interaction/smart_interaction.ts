import { CanvasObject } from "../selection/selection_engine";

export class SmartInteractionEngine {
  private activeObjectId: string | null = null;
  private menuVisible = false;

  /**
   * Tracks points targets to launch interactive contextual overlays.
   */
  public processInteraction(obj: CanvasObject, gesture: string): string | null {
    if (gesture === "Point") {
      this.activeObjectId = obj.id;
      this.menuVisible = true;
      return "ShowOptions";
    }

    if (gesture === "Pinch" && this.activeObjectId === obj.id && this.menuVisible) {
      this.menuVisible = false;
      this.activeObjectId = null;
      return "ExecuteAction";
    }

    return null;
  }

  public isMenuVisible(): boolean {
    return this.menuVisible;
  }

  public getActiveObjectId(): string | null {
    return this.activeObjectId;
  }
}
