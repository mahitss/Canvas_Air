import { SpeechTranscript } from "../types";

export interface SpeechProviderMetadata {
  id: string;
  name: string;
  type: "browser" | "offline" | "cloud";
  version: string;
}

export interface SpeechProviderHealth {
  status: "healthy" | "unhealthy";
  details: string;
  lastChecked: number;
}

/**
 * Speech Recognition Provider Contract.
 * Defines standard lifecycle methods for capturing audio inputs and performing transcript conversions.
 */
export interface ISpeechRecognitionProvider {
  readonly metadata: SpeechProviderMetadata;
  initialize(): Promise<void>;
  startListening(
    onResult: (result: SpeechTranscript) => void,
    onError: (error: Error) => void
  ): void;
  stopListening(): void;
  recognize(audioData: ArrayBuffer): Promise<SpeechTranscript>;
  dispose(): Promise<void>;
  health(): Promise<SpeechProviderHealth>;
}
