export interface SettingsProfile {
  cameraId: string;
  gestureSensitivity: number; // 0.1 to 2.0
  motionTrailQuality: "low" | "medium" | "high";
  activeTheme: "dark" | "light" | "high-contrast" | "colorblind-friendly";
  aiProviderUrl: string;
  performanceMode: "power-save" | "standard" | "high-fps";
  privacyDiagnosticsConsent: boolean;
  reducedMotion: boolean;
}

export class SettingsCenter {
  private activeSettings: SettingsProfile;

  constructor(
    initial: SettingsProfile = {
      cameraId: "default-webcam",
      gestureSensitivity: 1.0,
      motionTrailQuality: "medium",
      activeTheme: "dark",
      aiProviderUrl: "https://api.visioncanvas.ai",
      performanceMode: "standard",
      privacyDiagnosticsConsent: false,
      reducedMotion: false
    }
  ) {
    this.activeSettings = initial;
  }

  public getSettings(): SettingsProfile {
    return this.activeSettings;
  }

  /**
   * Commits modified configurations and reloads active style sheets.
   */
  public updateSettings(updates: Partial<SettingsProfile>): void {
    this.activeSettings = {
      ...this.activeSettings,
      ...updates
    };
  }

  public resetToDefaults(): void {
    this.activeSettings = {
      cameraId: "default-webcam",
      gestureSensitivity: 1.0,
      motionTrailQuality: "medium",
      activeTheme: "dark",
      aiProviderUrl: "https://api.visioncanvas.ai",
      performanceMode: "standard",
      privacyDiagnosticsConsent: false,
      reducedMotion: false
    };
  }
}
export * from "../types";
