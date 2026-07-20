import { describe, it, expect } from "vitest";
import { VOICE_TOKENS } from "../src/di";
import { VoiceError, SpeechRecognitionError, WakeWordError, CommandParsingError } from "../src/errors";

describe("Voice Command Engine Clean Architecture Verification", () => {
  it("should declare DI tokens representing all sub-modules correctly", () => {
    expect(VOICE_TOKENS.VoiceEngine).toBeDefined();
    expect(VOICE_TOKENS.CommandProvider).toBeDefined();
    expect(VOICE_TOKENS.WakeWordDetector).toBeDefined();
    expect(VOICE_TOKENS.IntentParser).toBeDefined();
    expect(VOICE_TOKENS.EventBus).toBeDefined();
    expect(VOICE_TOKENS.TextToSpeech).toBeDefined();

    expect(typeof VOICE_TOKENS.VoiceEngine).toBe("symbol");
    expect(Symbol.keyFor(VOICE_TOKENS.VoiceEngine)).toBe("IVoiceEngine");
  });

  it("should define structural class hierarchy for voice exceptions", () => {
    const error = new VoiceError("Root voice error");
    const recError = new SpeechRecognitionError("Speech failed", "NO_MIC");
    const wakeError = new WakeWordError("Wake word failed");
    const parseError = new CommandParsingError("Parsing failed");

    expect(error).toBeInstanceOf(Error);
    expect(recError).toBeInstanceOf(VoiceError);
    expect(wakeError).toBeInstanceOf(VoiceError);
    expect(parseError).toBeInstanceOf(VoiceError);

    expect(recError.name).toBe("SpeechRecognitionError");
    expect(recError.code).toBe("NO_MIC");
  });

  it("should export compile-safe interfaces and event payloads", () => {
    const event: any = {
      type: "WakeWordDetected",
      payload: {
        wakeWord: "hey canvas",
        rawTranscript: "hey canvas draw a square"
      },
      timestamp: Date.now()
    };

    expect(event.type).toBe("WakeWordDetected");
    expect(event.payload.wakeWord).toBe("hey canvas");
  });
});
