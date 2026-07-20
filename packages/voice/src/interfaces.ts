import { VoiceIntent, VoiceEntities, SpeechTranscript, VoiceCommandResult } from "./types";
import { VoiceBusEvent, VoiceBusEventType } from "./events";

export interface IVoiceEngine {
  startListening(
    onCommandDispatched?: (result: VoiceCommandResult) => void,
    onError?: (err: any) => void
  ): void;
  stopListening(): void;
  processTranscript(text: string, confidence: number): VoiceCommandResult;
}

export interface IVoiceCommandProvider {
  initialize(): Promise<void>;
  startRecognition(
    onResult: (transcript: SpeechTranscript) => void,
    onError: (error: Error) => void
  ): void;
  stopRecognition(): void;
  dispose(): Promise<void>;
  health(): Promise<{ status: string; details: string; lastChecked: number }>;
  version(): string;
}

export interface IWakeWordDetector {
  detect(transcript: string): boolean;
  setWakeWord(word: string): void;
}

export interface IIntentParser {
  parseCommand(text: string): { intent: VoiceIntent; entities: VoiceEntities };
}

export interface VoiceSubscribeOptions {
  replay?: boolean;
}

export interface IVoiceEventBus {
  publish(event: VoiceBusEvent): void;
  subscribe(
    type: VoiceBusEventType | "*",
    callback: (event: VoiceBusEvent) => void,
    options?: VoiceSubscribeOptions
  ): () => void;
  clearHistory(): void;
  unsubscribeAll(): void;
  getHistory(): VoiceBusEvent[];
}

export interface TtsSpeechOptions {
  voice?: string;
  rate?: number; // Speed: 0.5 - 2.0
  pitch?: number; // Pitch: 0.5 - 2.0
  volume?: number; // Volume: 0.0 - 1.0
  interrupt?: boolean; // Interrupt active playback immediately
}

export interface ITtsProvider {
  initialize(): Promise<void>;
  speak(text: string, options?: TtsSpeechOptions): Promise<void>;
  stop(): void;
  getAvailableVoices(): Promise<string[]>;
}

export interface ITextToSpeechService {
  speak(text: string, options?: TtsSpeechOptions): Promise<void>;
  stop(): void;
  queueSpeech(text: string, options?: TtsSpeechOptions): Promise<void>;
  setProvider(provider: ITtsProvider): void;
  getProvider(): ITtsProvider | null;
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
}

export interface AudioFrame {
  data: Float32Array;
  timestamp: number;
  audioLevel: number;
}

export interface IAudioCaptureService {
  enumerateDevices(): Promise<AudioDeviceInfo[]>;
  selectDevice(deviceId: string): void;
  startStreaming(
    onFrame: (frame: AudioFrame) => void,
    onError: (error: Error) => void
  ): Promise<void>;
  stopStreaming(): void;
  pauseStreaming(): void;
  resumeStreaming(): void;
  isCapturing(): boolean;
  getPreferredDeviceId(): string | null;
}

export interface StructuredCommand {
  intent: string;
  entities: Record<string, any>;
  rawText: string;
  isValid: boolean;
  errors?: string[] | undefined;
  isAmbiguous?: boolean | undefined;
  suggestions?: string[] | undefined;
}

export interface IVoiceCommandParser {
  parse(text: string, context?: any): StructuredCommand;
  registerAlias(intent: string, aliasPattern: string | RegExp): void;
}


