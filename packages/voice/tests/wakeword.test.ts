import { describe, it, expect } from "vitest";
import { WakeWordDetector } from "../src/wakeword/detector";

describe("Wake Word Detection System", () => {
  it("should match exact configurations and continuous speech streams", () => {
    const detector = new WakeWordDetector("hey canvas", 0.85);

    expect(detector.getWakeWord()).toBe("hey canvas");
    expect(detector.getSensitivity()).toBe(0.85);

    // Continuous exact checking
    expect(detector.detect("hey canvas draw a line")).toBe(true);
    expect(detector.detect("please hey canvas clear screen")).toBe(true);
  });

  it("should match fuzzy sound-alike words under reasonable sensitivities", () => {
    const detector = new WakeWordDetector("hey canvas", 0.70);

    // Phonetic variations
    expect(detector.detect("hay canvas draw a circle")).toBe(true);
    expect(detector.detect("hey canvass")).toBe(true);
    expect(detector.detect("hi canvas")).toBe(true);
  });

  it("should mitigate false positives under strict sensitivity configurations", () => {
    const detector = new WakeWordDetector("hey canvas", 0.90);

    // Phonetic colliders that are close but shouldn't trigger under high sensitivity
    expect(detector.detect("hey camera")).toBe(false);
    expect(detector.detect("canvas hey")).toBe(false);
    expect(detector.detect("hey painting")).toBe(false);
  });

  it("should support dynamic configurations of wake word values and sensitivities", () => {
    const detector = new WakeWordDetector();
    
    detector.setWakeWord("गोला बनाओ");
    detector.setSensitivity(0.80);

    expect(detector.detect("कृपया गोला बनाओ")).toBe(true);
    expect(detector.detect("वर्ग बनाओ")).toBe(false);

    expect(() => detector.setSensitivity(1.5)).toThrow();
  });
});
