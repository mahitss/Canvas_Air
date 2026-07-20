export class AuthorizationService {
  private rolePermissions: Map<string, Set<string>> = new Map();

  public registerRolePermissions(role: string, permissions: string[]): void {
    let permSet = this.rolePermissions.get(role);
    if (!permSet) {
      permSet = new Set();
      this.rolePermissions.set(role, permSet);
    }
    for (const p of permissions) {
      permSet.add(p);
    }
  }

  /**
   * Resolves Role-Based Access Control (RBAC) permission queries.
   */
  public authorize(roles: string[], requiredPermission: string): boolean {
    // Zero Trust check: if no roles are assigned, deny access
    if (roles.length === 0) return false;

    for (const role of roles) {
      const perms = this.rolePermissions.get(role);
      if (perms && perms.has(requiredPermission)) {
        return true;
      }
    }

    return false;
  }

  public clearRoles(): void {
    this.rolePermissions.clear();
  }
}
