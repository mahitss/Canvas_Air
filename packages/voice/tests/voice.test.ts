import { describe, it, expect, vi } from "vitest";
import { VoiceManager } from "../src/engine";
import { IntentEngine } from "../src/intent/engine";
import { CommandDispatcher } from "../src/dispatcher/dispatcher";

describe("Intent Recognition & Entity Extractions", () => {
  it("should match English and Hindi drawing commands", () => {
    const engine = new IntentEngine();

    // 1. English circle drawing check
    const r1 = engine.parseCommand("draw a circle");
    expect(r1.intent).toBe("drawing");
    expect(r1.entities.shapeName).toBe("circle");

    // 2. Hindi drawing command
    const r2 = engine.parseCommand("गोला बनाओ");
    expect(r2.intent).toBe("drawing");
    expect(r2.entities.shapeName).toBe("circle");
  });

  it("should parse brush controls and export settings", () => {
    const engine = new IntentEngine();

    // 1. Brush check
    const r1 = engine.parseCommand("change brush to neon");
    expect(r1.intent).toBe("brush_control");
    expect(r1.entities.brushType).toBe("neon");

    // 2. Export file formats
    const r2 = engine.parseCommand("export as SVG");
    expect(r2.intent).toBe("system");
    expect(r2.entities.format).toBe("svg");
  });
});

describe("Command Dispatcher Event Actions", () => {
  it("should trigger registered handler callbacks", () => {
    const dispatcher = new CommandDispatcher();
    const mockCallback = vi.fn();

    dispatcher.registerHandler("drawing", mockCallback);
    
    const dispatched = dispatcher.dispatch("drawing", { shapeName: "circle" });
    expect(dispatched).toBe(true);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({ shapeName: "circle" });
  });

  it("should ignore actions if no handlers are registered", () => {
    const dispatcher = new CommandDispatcher();
    const dispatched = dispatcher.dispatch("system", {});
    expect(dispatched).toBe(false);
  });
});

describe("Voice Manager Processing Coordinates", () => {
  it("should filter commands below config sensitivity thresholds", () => {
    const manager = new VoiceManager({
      wakeWord: "hey canvas",
      wakeWordEnabled: true,
      defaultLanguage: "en",
      sensitivityThreshold: 0.75, // high threshold
      textToSpeechEnabled: false,
      voiceVolume: 1.0,
      voiceSpeed: 1.0
    });

    // Score is 0.50, which is below 0.75, should yield unknown intent
    const result = manager.processTranscript("draw a circle", 0.50);
    expect(result.intent).toBe("unknown");
    expect(result.rawTranscript).toBe("draw a circle");
  });

  it("should execute valid inputs above threshold and add to history", () => {
    const manager = new VoiceManager({
      wakeWord: "hey canvas",
      wakeWordEnabled: true,
      defaultLanguage: "en",
      sensitivityThreshold: 0.50,
      textToSpeechEnabled: false,
      voiceVolume: 1.0,
      voiceSpeed: 1.0
    });

    const result = manager.processTranscript("undo", 0.85);
    expect(result.intent).toBe("editing");
    expect(manager.getHistory().length).toBe(1);
  });
});
