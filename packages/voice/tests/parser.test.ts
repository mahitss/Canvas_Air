import { describe, it, expect } from "vitest";
import { VoiceCommandParser } from "../src/command/parser";

describe("Voice Command Parser System", () => {
  it("should validate command syntax parameters", () => {
    const parser = new VoiceCommandParser();

    // Valid create command
    const r1 = parser.parse("create circle");
    expect(r1.intent).toBe("create");
    expect(r1.isValid).toBe(true);
    expect(r1.errors).toBeUndefined();

    // Invalid create command (missing shape name)
    const r2 = parser.parse("create");
    expect(r2.intent).toBe("create");
    expect(r2.isValid).toBe(false);
    expect(r2.errors).toContain("Missing shapeName parameter. Specify a shape (e.g. circle, square).");

    // Invalid zoom command
    const r3 = parser.parse("zoom");
    expect(r3.isValid).toBe(false);
  });

  it("should support dynamic registration and matching of alias mappings", () => {
    const parser = new VoiceCommandParser();

    // Default aliases
    const r1 = parser.parse("persist project");
    expect(r1.intent).toBe("save");

    const r2 = parser.parse("enlarge layer");
    expect(r2.intent).toBe("zoom");

    // Register a custom alias
    parser.registerAlias("delete", "destroy");
    const r3 = parser.parse("destroy shape");
    expect(r3.intent).toBe("delete");
  });

  it("should detect and flag ambiguous keywords and suggest resolutions", () => {
    const parser = new VoiceCommandParser();

    // Ambiguity A: single keyword delete command
    const r1 = parser.parse("clear");
    expect(r1.isAmbiguous).toBe(true);
    expect(r1.suggestions).toContain("clear whole screen");

    // Ambiguity B: keyword collision command
    const r2 = parser.parse("draw a circle and remove line");
    expect(r2.isAmbiguous).toBe(true);
    expect(r2.suggestions).toContain("draw shape");
  });
});
