import { describe, it, expect } from "vitest";
import { IntentRecognitionService } from "../src/intent/service";

describe("Intent Recognition Service", () => {
  it("should match default core intents and extract entities", () => {
    const service = new IntentRecognitionService();

    // 1. Create intent
    const r1 = service.recognize("draw a circle");
    expect(r1.intent).toBe("create");
    expect(r1.entities.shapeName).toBe("circle");
    expect(r1.confidence).toBeGreaterThan(0.7);

    // 2. Delete intent
    const r2 = service.recognize("clear screen");
    expect(r2.intent).toBe("delete");

    // 3. Zoom intent
    const r3 = service.recognize("zoom 150");
    expect(r3.intent).toBe("zoom");
    expect(r3.entities.dimensionValue).toBe(150);

    // 4. Export intent
    const r4 = service.recognize("export as svg");
    expect(r4.intent).toBe("export");
    expect(r4.entities.format).toBe("svg");
  });

  it("should support context-aware confidence boosting", () => {
    const service = new IntentRecognitionService();

    // Base match for search
    const baseResult = service.recognize("please find");
    expect(baseResult.intent).toBe("search");
    const baseConfidence = baseResult.confidence;

    // Boosted match under searchbar tool context
    const boostedResult = service.recognize("please find", { activeTool: "searchbar" });
    expect(boostedResult.intent).toBe("search");
    expect(boostedResult.confidence).toBeGreaterThan(baseConfidence);

    // Explicit boosted intents context map
    const explicitResult = service.recognize("please find", { boostedIntents: { search: 0.15 } });
    expect(explicitResult.confidence).toBe(Math.min(1.0, baseConfidence + 0.15));
  });

  it("should register and deregister custom intents dynamically", () => {
    const service = new IntentRecognitionService();

    // Register a custom Trigger VFX intent
    service.registerIntent({
      name: "vfx_trigger",
      patterns: ["sparkle", "fireworks", "glitter", /trigger\s+vfx/i],
      extractor: (txt) => {
        if (txt.includes("fireworks")) return { format: "fireworks" };
        return {};
      }
    });

    const result = service.recognize("trigger fireworks");
    expect(result.intent).toBe("vfx_trigger");
    expect(result.entities.format).toBe("fireworks");

    // Deregister
    service.deregisterIntent("vfx_trigger");
    const deregResult = service.recognize("trigger fireworks");
    expect(deregResult.intent).not.toBe("vfx_trigger");
  });
});
