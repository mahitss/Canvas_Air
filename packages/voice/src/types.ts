export type VoiceIntent =
  | "drawing"
  | "brush_control"
  | "editing"
  | "system"
  | "navigation"
  | "create"
  | "delete"
  | "undo"
  | "redo"
  | "zoom"
  | "search"
  | "export"
  | "save"
  | "unknown"
  | string;

export interface VoiceEntities {
  color?: string;
  brushType?: string;
  shapeName?: string;
  format?: string;
  dimensionValue?: number;
}

export interface SpeechTranscript {
  transcript: string;
  confidence: number;
}

export interface VoiceCommandResult {
  intent: VoiceIntent;
  entities: VoiceEntities;
  rawTranscript: string;
  confidence: number;
  executionTimeMs: number;
}

export interface VoiceEngineConfig {
  wakeWord: string;
  wakeWordEnabled: boolean;
  defaultLanguage: "en" | "hi";
  sensitivityThreshold: number; // 0.0 - 1.0
  textToSpeechEnabled: boolean;
  voiceVolume: number; // 0.0 - 1.0
  voiceSpeed: number; // 0.5 - 2.0
}
