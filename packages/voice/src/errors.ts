export class VoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceError";
  }
}

export class SpeechRecognitionError extends VoiceError {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "SpeechRecognitionError";
  }
}

export class WakeWordError extends VoiceError {
  constructor(message: string) {
    super(message);
    this.name = "WakeWordError";
  }
}

export class CommandParsingError extends VoiceError {
  constructor(message: string) {
    super(message);
    this.name = "CommandParsingError";
  }
}
