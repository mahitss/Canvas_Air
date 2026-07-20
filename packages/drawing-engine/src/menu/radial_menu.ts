export interface MenuItem {
  id: string;
  label: string;
  actionId: string;
  category: "brush" | "color" | "effect" | "tool" | "ai" | "custom";
}

export class RadialMenu {
  private active = false;
  private openGesture = "Thumbs Up";
  private selectedItemId: string | null = null;
  private readonly items = new Map<string, MenuItem>();

  public registerItem(item: MenuItem): void {
    this.items.set(item.id, { ...item });
  }

  /**
   * Toggles the radial menu when the registered shortcut posture is matched.
   */
  public evaluateGestureToggle(gestureName: string): boolean {
    if (gestureName === this.openGesture) {
      this.active = !this.active;
      return true;
    }
    return false;
  }

  public selectItem(id: string): void {
    if (this.items.has(id)) {
      this.selectedItemId = id;
    }
  }

  public getSelectedItemId(): string | null {
    return this.selectedItemId;
  }

  public isOpen(): boolean {
    return this.active;
  }

  public setOpenGesture(gesture: string): void {
    this.openGesture = gesture;
  }

  public getItems(): MenuItem[] {
    return Array.from(this.items.values());
  }
}
