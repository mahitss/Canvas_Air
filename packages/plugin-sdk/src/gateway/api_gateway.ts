import { PermissionManager } from "../permissions/manager";

export class ApiGateway {
  constructor(
    private readonly permissionManager: PermissionManager,
    private readonly subsystems: {
      canvas?: any;
      renderer?: any;
      ai?: any;
      drawing?: any;
      voice?: any;
      exporter?: any;
      settings?: any;
    }
  ) {}

  /**
   * Compiles the secure plugin context API gateway object, wrapping method access behind permission checks.
   */
  public compileGateway(pluginId: string) {
    return {
      canvas: {
        drawCircle: (x: number, y: number, r: number) => {
          this.permissionManager.checkPermission(pluginId, "Canvas");
          return this.subsystems.canvas?.drawCircle?.(x, y, r);
        },
        clear: () => {
          this.permissionManager.checkPermission(pluginId, "Canvas");
          return this.subsystems.canvas?.clear?.();
        }
      },
      renderer: {
        createLayer: (name: string, alpha: number) => {
          this.permissionManager.checkPermission(pluginId, "Canvas");
          return this.subsystems.renderer?.createLayer?.(name, alpha);
        },
        setLayerVisible: (id: string, visible: boolean) => {
          this.permissionManager.checkPermission(pluginId, "Canvas");
          return this.subsystems.renderer?.setLayerVisible?.(id, visible);
        }
      },
      ai: {
        routeTask: async (capability: string, payload: any) => {
          this.permissionManager.checkPermission(pluginId, "AI");
          return this.subsystems.ai?.routeTask?.(capability, payload);
        }
      },
      drawing: {
        addPointToStroke: (x: number, y: number, pressure: number) => {
          this.permissionManager.checkPermission(pluginId, "Canvas");
          return this.subsystems.drawing?.addPointToStroke?.(x, y, pressure);
        },
        smoothStroke: (points: any[]) => {
          return this.subsystems.drawing?.smoothStroke?.(points);
        }
      },
      voice: {
        listenForCommand: () => {
          this.permissionManager.checkPermission(pluginId, "Microphone");
          return this.subsystems.voice?.listenForCommand?.();
        }
      },
      exporter: {
        exportToPng: () => {
          this.permissionManager.checkPermission(pluginId, "Clipboard");
          return this.subsystems.exporter?.exportToPng?.();
        },
        saveToDisk: (filename: string, format: string) => {
          this.permissionManager.checkPermission(pluginId, "Filesystem");
          return this.subsystems.exporter?.saveToDisk?.(filename, format);
        }
      },
      settings: {
        getPreference: (key: string) => {
          this.permissionManager.checkPermission(pluginId, "Storage");
          return this.subsystems.settings?.getPreference?.(key);
        },
        setPreference: (key: string, value: any) => {
          this.permissionManager.checkPermission(pluginId, "Storage");
          return this.subsystems.settings?.setPreference?.(key, value);
        }
      }
    };
  }
}
