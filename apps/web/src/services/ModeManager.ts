// Centralized Mode Manager & Spatial Resource Lifecycle Engine for VisionCanvas AR

export interface SpatialMode {
  name: string;
  initialize(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  update(dt: number, handLandmarks: any, width: number, height: number): void;
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  dispose(): void;
}

// Centralized Resource Manager for automatic memory & canvas layer cleanup
export class ResourceManager {
  private static canvasLayers: Map<string, HTMLCanvasElement> = new Map();
  private static activeTimers: Set<NodeJS.Timeout> = new Set();

  static getOrCreateOffscreenCanvas(id: string, width: number, height: number): HTMLCanvasElement {
    if (!this.canvasLayers.has(id)) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      this.canvasLayers.set(id, canvas);
    }
    const layer = this.canvasLayers.get(id)!;
    if (layer.width !== width || layer.height !== height) {
      layer.width = width;
      layer.height = height;
    }
    return layer;
  }

  static trackTimer(timer: NodeJS.Timeout): NodeJS.Timeout {
    this.activeTimers.add(timer);
    return timer;
  }

  static clearTimer(timer: NodeJS.Timeout | null) {
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(timer);
    }
  }

  static disposeAll() {
    this.activeTimers.forEach(t => clearTimeout(t));
    this.activeTimers.clear();
    this.canvasLayers.clear();
  }
}

// Centralized Mode Manager
export class ModeManager {
  private modes: Map<string, SpatialMode> = new Map();
  private activeMode: SpatialMode | null = null;
  private currentModeName: string = "free";

  registerMode(mode: SpatialMode) {
    this.modes.set(mode.name, mode);
  }

  setActiveMode(name: string, ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.currentModeName === name && this.activeMode) return;

    // 1. Dispose previous active mode completely
    if (this.activeMode) {
      this.activeMode.dispose();
      this.activeMode = null;
    }

    // 2. Clear global tracked timers & layers
    ResourceManager.disposeAll();

    // 3. Initialize target new mode
    const targetMode = this.modes.get(name);
    if (targetMode) {
      targetMode.initialize(ctx, width, height);
      this.activeMode = targetMode;
      this.currentModeName = name;
    }
  }

  getActiveMode(): SpatialMode | null {
    return this.activeMode;
  }

  getActiveModeName(): string {
    return this.currentModeName;
  }

  update(dt: number, handLandmarks: any, width: number, height: number) {
    if (this.activeMode) {
      this.activeMode.update(dt, handLandmarks, width, height);
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.activeMode) {
      this.activeMode.render(ctx, width, height);
    }
  }

  disposeCurrentMode() {
    if (this.activeMode) {
      this.activeMode.dispose();
      this.activeMode = null;
    }
    ResourceManager.disposeAll();
  }
}
