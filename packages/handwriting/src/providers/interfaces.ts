import { Stroke2D, RecognitionResult } from "../types";

export interface ProviderHealth {
  status: "healthy" | "unhealthy" | "degraded";
  details?: string;
  lastChecked: number;
}

export interface IHandwritingRecognitionProvider {
  initialize(): Promise<void>;
  recognize(strokes: Stroke2D[]): Promise<RecognitionResult>;
  dispose(): Promise<void>;
  health(): Promise<ProviderHealth>;
  version(): string;
}
