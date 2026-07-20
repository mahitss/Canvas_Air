import { SupportedLanguage } from "./types";

export interface HandwritingEngineConfig {
  defaultLanguage: SupportedLanguage;
  confidenceThreshold: number; // 0.0 - 1.0
  autoCorrectWords: boolean;
  contextAwareCorrections: boolean;
  characterResampleCount: number;
}

export const DEFAULT_HANDWRITING_CONFIG: HandwritingEngineConfig = {
  defaultLanguage: "en",
  confidenceThreshold: 0.60,
  autoCorrectWords: true,
  contextAwareCorrections: true,
  characterResampleCount: 32
};
