// VisionCanvas AR Unified Spatial Engine Core Architecture
// Inspired by Unreal Engine, Unity, and Apple Reality Composer

export interface SpatialWorkspace {
  name: string;
  initialize(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  update(dt: number, handLandmarks: any, width: number, height: number): void;
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  dispose(): void;
}

// 1. RESOURCE MANAGER: Automatic lifecycle tracking & disposal for all memory & canvas objects
export class ResourceManager {
  private static canvasPool: Map<string, HTMLCanvasElement> = new Map();
  private static trackedTimers: Set<NodeJS.Timeout> = new Set();

  static getOrCreateCanvasLayer(id: string, width: number, height: number): HTMLCanvasElement {
    if (!this.canvasPool.has(id)) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      this.canvasPool.set(id, canvas);
    }
    const layer = this.canvasPool.get(id)!;
    if (layer.width !== width || layer.height !== height) {
      layer.width = width;
      layer.height = height;
    }
    return layer;
  }

  static registerTimer(timer: NodeJS.Timeout): NodeJS.Timeout {
    this.trackedTimers.add(timer);
    return timer;
  }

  static clearTimer(timer: NodeJS.Timeout | null) {
    if (timer) {
      clearTimeout(timer);
      this.trackedTimers.delete(timer);
    }
  }

  static disposeAll() {
    this.trackedTimers.forEach(t => clearTimeout(t));
    this.trackedTimers.clear();
    this.canvasPool.clear();
  }
}

// 2. SCENE MANAGER: Scene graph creation & complete destruction on mode switch
export class SceneManager {
  private currentSceneObjects: any[] = [];

  createScene(modeName: string) {
    this.destroyScene();
    this.currentSceneObjects = [{ mode: modeName, timestamp: Date.now() }];
  }

  destroyScene() {
    this.currentSceneObjects = [];
  }

  getSceneObjects(): any[] {
    return this.currentSceneObjects;
  }
}

// 3. DEBUG MANAGER: Strict developer mode scoping (0 debug rendering in production)
export class DebugManager {
  private static isDevMode = false;

  static setDevMode(enabled: boolean) {
    this.isDevMode = enabled;
  }

  static isDebugActive(): boolean {
    return this.isDevMode;
  }
}

// 4. MODE MANAGER: Enforces strictly ONE active workspace at any time
export class ModeManager {
  private workspaces: Map<string, SpatialWorkspace> = new Map();
  private activeWorkspace: SpatialWorkspace | null = null;
  private activeModeName: string = "free";
  private sceneManager: SceneManager;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  registerWorkspace(workspace: SpatialWorkspace) {
    this.workspaces.set(workspace.name, workspace);
  }

  switchMode(newModeName: string, ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.activeModeName === newModeName && this.activeWorkspace) return;

    // 1. Dispose active workspace
    if (this.activeWorkspace) {
      this.activeWorkspace.dispose();
      this.activeWorkspace = null;
    }

    // 2. Destroy scene graph & clear all tracked resources
    this.sceneManager.destroyScene();
    ResourceManager.disposeAll();

    // 3. Create & initialize new mode workspace
    const targetWorkspace = this.workspaces.get(newModeName);
    if (targetWorkspace) {
      this.sceneManager.createScene(newModeName);
      targetWorkspace.initialize(ctx, width, height);
      this.activeWorkspace = targetWorkspace;
      this.activeModeName = newModeName;
    }
  }

  getActiveWorkspace(): SpatialWorkspace | null {
    return this.activeWorkspace;
  }

  getActiveModeName(): string {
    return this.activeModeName;
  }
}

// 5. RENDER MANAGER: Unified 60Hz single render loop (No nested loops, no inactive rendering)
export class RenderManager {
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTimestamp = 0;

  startLoop(
    modeManager: ModeManager,
    ctxProvider: () => CanvasRenderingContext2D | null,
    dimensionsProvider: () => { width: number; height: number },
    landmarksProvider: () => any
  ) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      if (!this.isRunning) return;

      const dt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      const ctx = ctxProvider();
      const dims = dimensionsProvider();
      const activeWorkspace = modeManager.getActiveWorkspace();
      const landmarks = landmarksProvider();

      if (ctx && activeWorkspace) {
        // Single update pass
        activeWorkspace.update(dt, landmarks, dims.width, dims.height);

        // Single render pass
        activeWorkspace.render(ctx, dims.width, dims.height);
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  stopLoop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}
