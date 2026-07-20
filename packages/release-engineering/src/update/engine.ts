import { ReleaseVersion, UpdateManifest, UpdatePatch } from "../types";

export class UpdateEngine {
  public parseSemver(versionStr: string): ReleaseVersion {
    const parts = versionStr.split("-");
    const mainPart = parts[0];
    const preRelease = parts[1];

    if (!mainPart) {
      throw new Error(`Invalid SemVer format: ${versionStr}`);
    }

    const numbers = mainPart.split(".");
    const majorStr = numbers[0];
    const minorStr = numbers[1];
    const patchStr = numbers[2];

    if (majorStr === undefined || minorStr === undefined || patchStr === undefined) {
      throw new Error(`Invalid SemVer format: ${versionStr}`);
    }

    const result: ReleaseVersion = {
      major: parseInt(majorStr, 10),
      minor: parseInt(minorStr, 10),
      patch: parseInt(patchStr, 10)
    };
    if (preRelease !== undefined) {
      result.preRelease = preRelease;
    }
    return result;
  }

  public compareVersions(v1: ReleaseVersion, v2: ReleaseVersion): number {
    if (v1.major !== v2.major) return v1.major - v2.major;
    if (v1.minor !== v2.minor) return v1.minor - v2.minor;
    if (v1.patch !== v2.patch) return v1.patch - v2.patch;

    // Check pre-releases: pre-release version is lower than full release
    if (v1.preRelease && !v2.preRelease) return -1;
    if (!v1.preRelease && v2.preRelease) return 1;
    if (v1.preRelease && v2.preRelease) {
      return v1.preRelease.localeCompare(v2.preRelease);
    }

    return 0;
  }

  /**
   * Evaluates if update package version is newer than client's active version.
   */
  public checkForUpdates(currentVersion: string, manifest: UpdateManifest): boolean {
    const current = this.parseSemver(currentVersion);
    const target = this.parseSemver(manifest.version);
    return this.compareVersions(target, current) > 0;
  }

  /**
   * Resolves patch deltas files paths matching the client's current version coordinates.
   */
  public resolvePatch(currentVersion: string, manifest: UpdateManifest): UpdatePatch | null {
    for (const patch of manifest.patches) {
      if (patch.fromVersion === currentVersion) {
        return patch;
      }
    }
    return null;
  }
}
export * from "../types";
export * from "../config";
export * from "../build/system";
export * from "../packaging/engine";
export * from "../update/engine";
export * from "../release/manager";
