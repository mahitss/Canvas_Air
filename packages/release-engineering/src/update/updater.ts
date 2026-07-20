import { UpdateManifest } from "../types";

export class ApplicationUpdater {
  private activeVersion = "1.0.0";
  private backupVersion: string | null = null;
  private isRollingBack = false;

  /**
   * Applies update target packages resetting version flags and rollback backups.
   */
  public async applyUpdate(manifest: UpdateManifest): Promise<boolean> {
    this.backupVersion = this.activeVersion;

    try {
      // Simulate download and apply
      if (manifest.version === "faulty-version") {
        throw new Error("Update installation corrupted");
      }
      this.activeVersion = manifest.version;
      return true;
    } catch {
      await this.rollback();
      return false;
    }
  }

  public async rollback(): Promise<void> {
    if (this.backupVersion) {
      this.isRollingBack = true;
      this.activeVersion = this.backupVersion;
      this.backupVersion = null;
    }
  }

  public getActiveVersion(): string {
    return this.activeVersion;
  }

  public isRollingBackActive(): boolean {
    return this.isRollingBack;
  }

  public resetFlags(): void {
    this.isRollingBack = false;
  }
}
export * from "../types";
export * from "../config";
export * from "../build/system";
export * from "../packaging/engine";
export * from "../update/engine";
export * from "../release/manager";
