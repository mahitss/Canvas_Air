export interface ApiVersionMapping {
  version: string;
  deprecated?: boolean;
  deprecationWarning?: string;
  adapt?: (args: any[]) => any[];
}

export class ApiVersionManager {
  private readonly versionMappings = new Map<string, Map<string, ApiVersionMapping>>(); // apiName -> (apiVersion -> Mapping)

  public registerApiVersion(apiName: string, mapping: ApiVersionMapping): void {
    let apiMap = this.versionMappings.get(apiName);
    if (!apiMap) {
      apiMap = new Map();
      this.versionMappings.set(apiName, apiMap);
    }
    apiMap.set(mapping.version, mapping);
  }

  /**
   * Resolves the best API version for a plugin and returns parameter adaptations / deprecation warnings.
   */
  public negotiateVersion(apiName: string, requestedVersionRange: string): {
    resolvedVersion: string;
    shouldWarn: boolean;
    warningMessage: string | undefined;
    adaptArgs: ((args: any[]) => any[]) | undefined;
  } {
    const apiMap = this.versionMappings.get(apiName);
    if (!apiMap || apiMap.size === 0) {
      throw new Error(`ApiVersioningError: No versions registered for API: ${apiName}`);
    }

    // Resolve matching version (for simplicity, find the highest compatible version matching range)
    let bestMatch: ApiVersionMapping | undefined;

    for (const mapping of apiMap.values()) {
      if (this.satisfies(mapping.version, requestedVersionRange)) {
        if (!bestMatch || this.compareVersions(mapping.version, bestMatch.version) > 0) {
          bestMatch = mapping;
        }
      }
    }

    if (!bestMatch) {
      throw new Error(`ApiVersioningError: No compatible version found for API '${apiName}' matching constraint '${requestedVersionRange}'`);
    }

    return {
      resolvedVersion: bestMatch.version,
      shouldWarn: !!bestMatch.deprecated,
      warningMessage: bestMatch.deprecationWarning,
      adaptArgs: bestMatch.adapt
    };
  }

  private satisfies(version: string, constraint: string): boolean {
    if (constraint === "*" || constraint === version) return true;
    if (constraint.startsWith("^")) {
      const vParts = version.split(".").map(Number);
      const cParts = constraint.replace("^", "").split(".").map(Number);
      return vParts[0] === cParts[0] && (vParts[1] ?? 0) >= (cParts[1] ?? 0);
    }
    return false;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] ?? 0;
      const p2 = parts2[i] ?? 0;
      if (p1 !== p2) return p1 - p2;
    }
    return 0;
  }
}
