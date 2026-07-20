export type PluginPermission =
  | "Camera"
  | "Microphone"
  | "Canvas"
  | "Storage"
  | "AI"
  | "Cloud"
  | "Clipboard"
  | "Filesystem"
  | "Network"
  | "Plugins";

export const VALID_PERMISSIONS: Set<string> = new Set([
  "Camera",
  "Microphone",
  "Canvas",
  "Storage",
  "AI",
  "Cloud",
  "Clipboard",
  "Filesystem",
  "Network",
  "Plugins"
]);

export class PermissionManager {
  private readonly allowedPermissions = new Map<string, Set<string>>();

  /**
   * Registers a plugin's authorized permission list, validating them against the strict standard set.
   */
  public grantPermissions(pluginId: string, permissions: string[]): void {
    const validSet = new Set<string>();
    for (const p of permissions) {
      if (!VALID_PERMISSIONS.has(p)) {
        throw new Error(`Invalid Permission Request: '${p}' is not a recognized platform permission`);
      }
      validSet.add(p);
    }
    this.allowedPermissions.set(pluginId, validSet);
  }

  /**
   * Asserts whether a plugin has been granted specific permission, throwing security errors on failures.
   */
  public checkPermission(pluginId: string, permission: string): void {
    const permissionsSet = this.allowedPermissions.get(pluginId);
    
    if (!permissionsSet || !permissionsSet.has(permission)) {
      throw new Error(
        `Security Violation: Plugin '${pluginId}' does not possess required permission: '${permission}'`
      );
    }
  }

  /**
   * Revokes all permissions for a plugin.
   */
  public revokePermissions(pluginId: string): void {
    this.allowedPermissions.delete(pluginId);
  }

  /**
   * Checks if permission is currently granted.
   */
  public hasPermission(pluginId: string, permission: string): boolean {
    const permissionsSet = this.allowedPermissions.get(pluginId);
    return !!permissionsSet && permissionsSet.has(permission);
  }
}
export * from "../types";
export * from "../config";
