import { PluginManifest } from "../types";

export interface DependencyNode {
  manifest: PluginManifest;
  dependencies: string[];
}

export class DependencyResolver {
  /**
   * Sorts list of manifests topologically to satisfy initialization order.
   * Detects circular dependencies and version mismatches.
   */
  public resolveOrder(manifests: PluginManifest[]): string[] {
    const manifestMap = new Map<string, PluginManifest>();
    for (const m of manifests) {
      manifestMap.set(m.id, m);
    }

    const resolved = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visiting.has(id)) {
        throw new Error(`CircularDependencyError: Cycle detected targeting dependency ID: ${id}`);
      }
      if (resolved.has(id)) return;

      const m = manifestMap.get(id);
      if (!m) {
        throw new Error(`MissingDependencyError: Required dependency '${id}' is not loaded`);
      }

      visiting.add(id);

      // Visit dependencies
      for (const [depId, depConstraint] of Object.entries(m.dependencies)) {
        const depManifest = manifestMap.get(depId);
        if (!depManifest) {
          throw new Error(`MissingDependencyError: Plugin '${id}' requires dependency '${depId}' but it is missing`);
        }

        // Verify version constraint matching (e.g. ^1.0.0, ~1.0.0, or exact match)
        const isCompatible = this.satisfies(depManifest.version, depConstraint);
        if (!isCompatible) {
          throw new Error(`VersionConflictError: Dependency '${depId}' (version ${depManifest.version}) does not satisfy constraint '${depConstraint}' required by '${id}'`);
        }

        visit(depId);
      }

      visiting.delete(id);
      resolved.add(id);
      order.push(id);
    };

    for (const m of manifests) {
      visit(m.id);
    }

    return order;
  }

  /**
   * Checks if version satisfies constraint. Supports basic ranges.
   */
  public satisfies(version: string, constraint: string): boolean {
    if (constraint === "*" || constraint === version) return true;

    const cleanVer = version.replace(/[^\d\.]/g, "");
    const cleanConst = constraint.replace(/[^\d\.]/g, "");

    const verParts = cleanVer.split(".").map(Number);
    const constParts = cleanConst.split(".").map(Number);

    if (constraint.startsWith("^")) {
      // Major must match, minor/patch of version must be >= constraint
      if (verParts[0] !== constParts[0]) return false;
      if (verParts[1] !== (constParts[1] ?? 0)) {
        return (verParts[1] ?? 0) > (constParts[1] ?? 0);
      }
      return (verParts[2] ?? 0) >= (constParts[2] ?? 0);
    }

    if (constraint.startsWith("~")) {
      // Major and Minor must match
      if (verParts[0] !== constParts[0] || verParts[1] !== constParts[1]) return false;
      return (verParts[2] ?? 0) >= (constParts[2] ?? 0);
    }

    // Default exact match fallbacks
    for (let i = 0; i < Math.max(verParts.length, constParts.length); i++) {
      if ((verParts[i] ?? 0) !== (constParts[i] ?? 0)) return false;
    }
    return true;
  }
}
