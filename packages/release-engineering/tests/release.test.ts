import { describe, it, expect, beforeEach } from "vitest";
import { BuildSystem } from "../src/build/system";
import { PackagingEngine } from "../src/packaging/engine";
import { UpdateEngine } from "../src/update/engine";
import { ReleaseManager } from "../src/release/manager";
import { UpdateManifest } from "../src/types";

describe("Deployment, Packaging & Release Engineering Platform", () => {
  let buildSystem: BuildSystem;
  let packagingEngine: PackagingEngine;
  let updateEngine: UpdateEngine;
  let releaseManager: ReleaseManager;

  beforeEach(() => {
    buildSystem = new BuildSystem();
    packagingEngine = new PackagingEngine();
    updateEngine = new UpdateEngine();
    releaseManager = new ReleaseManager();

    releaseManager.clearHistory();
  });

  it("should generate deterministic compilation hashes from source files maps", async () => {
    const files = new Map<string, string>([
      ["src/index.ts", "console.log('Main Execution');"],
      ["src/types.ts", "export interface User { id: string }"]
    ]);

    const hash1 = await buildSystem.compileDeterministic(files);
    
    // Changing traversal keys order should output matching hash (due to sorting)
    const disorderedFiles = new Map<string, string>([
      ["src/types.ts", "export interface User { id: string }"],
      ["src/index.ts", "console.log('Main Execution');"]
    ]);

    const hash2 = await buildSystem.compileDeterministic(disorderedFiles);
    expect(hash1).toBe(hash2);
  });

  it("should bundle packages and calculate validation signatures in PackagingEngine", async () => {
    const buildHash = "e10a20bf";
    const packResult = await packagingEngine.packageArtifact(buildHash, "windows", "production", "stable");
    
    expect(packResult.success).toBe(true);
    expect(packResult.artifact).toBeDefined();

    const artifact = packResult.artifact!;
    expect(artifact.fileName).toBe("visioncanvas-windows-stable-production.zip");
    expect(artifact.signature).toBe(`sig-${artifact.checksum}-signed`);

    // Verify verification check
    expect(packagingEngine.verifyArtifact(artifact)).toBe(true);
  });

  it("should evaluate version compatibility and patches using UpdateEngine SemVer checks", () => {
    const manifest: UpdateManifest = {
      version: "2.1.0-beta.1",
      releaseNotes: "Incremental optimizations",
      requiredMinSDK: "1.0.0",
      patches: [
        { fromVersion: "2.0.0", deltaFileName: "patch-2.0.0-to-2.1.0.bin", checksum: "hash123" }
      ]
    };

    // Client at version 2.0.0 should trigger update checking true
    expect(updateEngine.checkForUpdates("2.0.0", manifest)).toBe(true);

    // Client at version 2.1.0 (already up-to-date) should trigger false
    expect(updateEngine.checkForUpdates("2.1.0", manifest)).toBe(false);

    // Resolve patch delta binary mapping
    const patch = updateEngine.resolvePatch("2.0.0", manifest);
    expect(patch).not.toBeNull();
    expect(patch?.deltaFileName).toBe("patch-2.0.0-to-2.1.0.bin");
  });

  it("should publish updates and perform rollbacks in ReleaseManager channels", () => {
    releaseManager.publish("stable", "1.0.0", "art-001");
    releaseManager.publish("stable", "1.1.0", "art-002");
    
    expect(releaseManager.getActiveVersion("stable")).toBe("1.1.0");

    // Rollback stable channel back to 1.0.0
    const rolledBackVersion = releaseManager.rollback("stable");
    expect(rolledBackVersion).toBe("1.0.0");
    expect(releaseManager.getActiveVersion("stable")).toBe("1.0.0");
  });
});
