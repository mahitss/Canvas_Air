import { VoiceCommandResult } from "./types";

export type VoiceBusEventType =
  | "ListeningStarted"
  | "ListeningStopped"
  | "WakeWordDetected"
  | "SpeechRecognized"
  | "IntentRecognized"
  | "CommandParsed"
  | "VoiceError";

export interface ListeningStartedEvent {
  type: "ListeningStarted";
  payload: { timestamp: number };
  timestamp: number;
}

export interface ListeningStoppedEvent {
  type: "ListeningStopped";
  payload: { timestamp: number };
  timestamp: number;
}

export interface WakeWordDetectedEvent {
  type: "WakeWordDetected";
  payload: { wakeWord: string; rawTranscript: string };
  timestamp: number;
}

export interface SpeechRecognizedEvent {
  type: "SpeechRecognized";
  payload: { text: string; confidence: number };
  timestamp: number;
}

export interface IntentRecognizedEvent {
  type: "IntentRecognized";
  payload: { intent: string; confidence: number; entities: Record<string, any> };
  timestamp: number;
}

export interface CommandParsedEvent {
  type: "CommandParsed";
  payload: { result: VoiceCommandResult };
  timestamp: number;
}

export interface VoiceErrorEvent {
  type: "VoiceError";
  payload: { error: string; code?: string };
  timestamp: number;
}

export type VoiceBusEvent =
  | ListeningStartedEvent
  | ListeningStoppedEvent
  | WakeWordDetectedEvent
  | SpeechRecognizedEvent
  | IntentRecognizedEvent
  | CommandParsedEvent
  | VoiceErrorEvent;

