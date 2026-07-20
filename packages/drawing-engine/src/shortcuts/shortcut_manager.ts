export type ShortcutActionType =
  | "Undo"
  | "Redo"
  | "Copy"
  | "Paste"
  | "Duplicate"
  | "Screenshot"
  | "Export"
  | "Custom";

export class ShortcutManager {
  private readonly shortcuts = new Map<string, ShortcutActionType>();
  private readonly history: ShortcutActionType[] = [];

  public bindShortcut(gesture: string, action: ShortcutActionType): void {
    this.shortcuts.set(gesture, action);
  }

  /**
   * Matches gestures against custom profiles to trigger undo/redo/screenshot commands.
   */
  public evaluateShortcut(gesture: string): ShortcutActionType | null {
    const action = this.shortcuts.get(gesture);
    if (action) {
      this.history.push(action);
      return action;
    }
    return null;
  }

  public getHistory(): ShortcutActionType[] {
    return this.history;
  }

  public clearHistory(): void {
    this.history.length = 0;
  }
}
