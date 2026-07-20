import { VoiceEngineConfig } from "./types";

export const DEFAULT_VOICE_CONFIG: VoiceEngineConfig = {
  wakeWord: "hey canvas",
  wakeWordEnabled: true,
  defaultLanguage: "en",
  sensitivityThreshold: 0.60,
  textToSpeechEnabled: true,
  voiceVolume: 0.8,
  voiceSpeed: 1.0
};
