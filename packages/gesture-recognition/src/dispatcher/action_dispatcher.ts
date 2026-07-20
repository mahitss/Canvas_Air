export type GestureActionType =
  | "ApplicationAction"
  | "AICommand"
  | "DrawingTool"
  | "SystemShortcut"
  | "PluginAction";

export interface GestureActionMapping {
  gestureName: string;
  actionId: string;
  type: GestureActionType;
}

export class ActionDispatcher {
  private readonly mappings = new Map<string, GestureActionMapping>();
  private readonly dispatchedHistory: string[] = [];

  public registerMapping(mapping: GestureActionMapping): void {
    this.mappings.set(mapping.gestureName, { ...mapping });
  }

  /**
   * Matches gestures to mapped applications or system shortcuts callbacks.
   */
  public dispatch(gestureName: string): boolean {
    const mapping = this.mappings.get(gestureName);
    if (!mapping) return false;

    this.dispatchedHistory.push(mapping.actionId);
    return true;
  }

  public getHistory(): string[] {
    return this.dispatchedHistory;
  }

  public getMapping(gestureName: string): GestureActionMapping | null {
    return this.mappings.get(gestureName) || null;
  }
}
