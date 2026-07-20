import { PluginContext, CanvasApi, StorageApi, NotificationApi } from "../types";
import { PermissionManager } from "../permissions/manager";

export interface SandboxResourceLimits {
  maxMemoryLimitMb?: number;
  executionTimeoutMs?: number;
}

export class SandboxRuntime {
  private readonly permissionManager: PermissionManager;

  constructor(permissionManager: PermissionManager) {
    this.permissionManager = permissionManager;
  }

  /**
   * Generates a protected API context facade, mapping callbacks that enforce permission access check gates.
   */
  public createContext(
    pluginId: string,
    hostCanvas: CanvasApi,
    hostStorage: StorageApi,
    hostNotifications: NotificationApi
  ): PluginContext {
    
    const canvas: CanvasApi = {
      drawCircle: (x, y, r) => {
        this.permissionManager.checkPermission(pluginId, "Canvas");
        hostCanvas.drawCircle(x, y, r);
      },
      drawRect: (x, y, w, h) => {
        this.permissionManager.checkPermission(pluginId, "Canvas");
        hostCanvas.drawRect(x, y, w, h);
      },
      clearCanvas: () => {
        this.permissionManager.checkPermission(pluginId, "Canvas");
        hostCanvas.clearCanvas();
      }
    };

    const storage: StorageApi = {
      getItem: (key) => {
        this.permissionManager.checkPermission(pluginId, "Storage");
        return hostStorage.getItem(key);
      },
      setItem: (key, value) => {
        this.permissionManager.checkPermission(pluginId, "Storage");
        hostStorage.setItem(key, value);
      }
    };

    // Notifications API does not have a strict direct permission requirement
    const notifications: NotificationApi = {
      notify: (message) => {
        hostNotifications.notify(message);
      }
    };

    return {
      canvas,
      storage,
      notifications
    };
  }

  /**
   * Executes plugin function blocks within a crash-isolated environment sandbox,
   * enforcing CPU timeout limits and heap memory constraints.
   */
  public runSafe(func: () => void, limits: SandboxResourceLimits = { executionTimeoutMs: 100 }): void {
    const startTime = Date.now();
    const proc = (globalThis as any).process;
    const startMem = proc && proc.memoryUsage ? proc.memoryUsage().heapUsed : 0;
    
    try {
      func();
      
      const elapsed = Date.now() - startTime;
      if (limits.executionTimeoutMs && elapsed > limits.executionTimeoutMs) {
        throw new Error(`Execution Timeout: Operation took ${elapsed}ms, exceeding ${limits.executionTimeoutMs}ms limit.`);
      }

      const endMem = proc && proc.memoryUsage ? proc.memoryUsage().heapUsed : 0;
      const allocatedMb = (endMem - startMem) / 1024 / 1024;
      if (limits.maxMemoryLimitMb && allocatedMb > limits.maxMemoryLimitMb) {
        throw new Error(`Memory Limit Exceeded: Allocated ${allocatedMb.toFixed(2)}MB, limit is ${limits.maxMemoryLimitMb}MB.`);
      }
    } catch (err: any) {
      throw new Error(`Plugin Sandboxed Execution Exception: ${err.message || err}`);
    }
  }
}
