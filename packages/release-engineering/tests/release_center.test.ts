import { describe, it, expect } from "vitest";
import { SettingsCenter } from "../src/settings/settings_center";
import { FirstTimeExperience } from "../src/onboarding/experience";
import { DiagnosticsCollector } from "../src/diagnostics/collector";
import { ApplicationUpdater } from "../src/update/updater";

describe("Release Engineering & Setup Center", () => {
  it("should configure custom settings variables and reset defaults", () => {
    const center = new SettingsCenter();
    expect(center.getSettings().activeTheme).toBe("dark");

    center.updateSettings({ activeTheme: "high-contrast", gestureSensitivity: 1.8 });
    expect(center.getSettings().activeTheme).toBe("high-contrast");
    expect(center.getSettings().gestureSensitivity).toBe(1.8);

    center.resetToDefaults();
    expect(center.getSettings().activeTheme).toBe("dark");
  });

  it("should advance onboarding step guides after calibrations", () => {
    const experience = new FirstTimeExperience();
    expect(experience.getStatus().currentStep).toBe("CameraPermission");

    experience.grantCameraPermission();
    expect(experience.getStatus().currentStep).toBe("HandCalibration");

    experience.calibrateHand();
    expect(experience.getStatus().currentStep).toBe("BasicGesturesTutorial");

    const next = experience.advanceStep();
    expect(next).toBe("FirstAirDrawing");
  });

  it("should submit system diagnostic payload data only when consent is active", () => {
    const collector = new DiagnosticsCollector();
    const payload = {
      fps: 60,
      gpuRenderer: "Intel Iris Xe",
      cameraResolution: "1080p",
      trackingScore: 0.98,
      timestamp: 0
    };

    expect(collector.submitPayload(payload)).toBe(false); // denied

    collector.setConsent(true);
    expect(collector.submitPayload(payload)).toBe(true); // allowed
    expect(collector.getReports().length).toBe(1);
  });

  it("should deploy application updates and rollback cleanly on crashes", async () => {
    const updater = new ApplicationUpdater();
    expect(updater.getActiveVersion()).toBe("1.0.0");

    const okUpdate = {
      version: "1.1.0",
      releaseNotes: "Performance upgrades",
      requiredMinSDK: "1.0.0",
      patches: []
    };

    const applied = await updater.applyUpdate(okUpdate);
    expect(applied).toBe(true);
    expect(updater.getActiveVersion()).toBe("1.1.0");

    const faultyUpdate = {
      version: "faulty-version",
      releaseNotes: "Broken update package",
      requiredMinSDK: "1.0.0",
      patches: []
    };

    const failed = await updater.applyUpdate(faultyUpdate);
    expect(failed).toBe(false);
    expect(updater.getActiveVersion()).toBe("1.1.0"); // rolled back to 1.1.0
    expect(updater.isRollingBackActive()).toBe(true);
  });
});
