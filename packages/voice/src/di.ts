export const VOICE_TOKENS = {
  VoiceEngine: Symbol.for("IVoiceEngine"),
  CommandProvider: Symbol.for("IVoiceCommandProvider"),
  WakeWordDetector: Symbol.for("IWakeWordDetector"),
  IntentParser: Symbol.for("IIntentParser"),
  EventBus: Symbol.for("IVoiceEventBus"),
  TextToSpeech: Symbol.for("ITextToSpeechService")
};
