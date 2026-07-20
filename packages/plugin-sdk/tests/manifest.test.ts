import { describe, it, expect } from "vitest";
import { ManifestParser, MANIFEST_JSON_SCHEMA } from "../src/manifest/parser";
import { PluginValidationException } from "../src/errors";

describe("Plugin Manifest System", () => {
  it("should validate and parse correct manifest JSON schema properties", () => {
    const validJson = JSON.stringify({
      id: "drawing-effects-plugin",
      name: "Drawing Effects",
      version: "1.0.4",
      author: "Gemini Team",
      description: "Applies particle effects on drawing lines",
      permissions: ["canvas_draw", "vfx_burst"],
      dependencies: {
        "vfx-engine": "^1.0.0"
      },
      minimumPlatformVersion: "1.0.0",
      entryPoint: "dist/index.js"
    });

    const manifest = ManifestParser.parse(validJson);
    expect(manifest.id).toBe("drawing-effects-plugin");
    expect(manifest.minimumPlatformVersion).toBe("1.0.0");
    expect(manifest.dependencies["vfx-engine"]).toBe("^1.0.0");
  });

  it("should throw validation exception on missing required properties", () => {
    const invalidJson = JSON.stringify({
      id: "incomplete-plugin",
      name: "Incomplete"
      // missing version, author, description, permissions, etc.
    });

    expect(() => ManifestParser.parse(invalidJson)).toThrow(PluginValidationException);
  });

  it("should check schema definitions types and reject extraneous fields", () => {
    // Schema presence check
    expect(MANIFEST_JSON_SCHEMA.required).toContain("minimumPlatformVersion");

    const extraFieldsJson = JSON.stringify({
      id: "drawing-effects-plugin",
      name: "Drawing Effects",
      version: "1.0.4",
      author: "Gemini Team",
      description: "Applies particle effects on drawing lines",
      permissions: ["canvas_draw", "vfx_burst"],
      dependencies: {},
      minimumPlatformVersion: "1.0.0",
      entryPoint: "dist/index.js",
      hackedProperty: "malicious" // disallowed by additionalProperties: false schema check
    });

    expect(() => ManifestParser.parse(extraFieldsJson)).toThrow(PluginValidationException);
  });
});
