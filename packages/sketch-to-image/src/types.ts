export interface ImageGenerationOptions {
  style: string; // e.g. "Illustration", "Concept Art", "Product Mockup"
  aspectRatio: string; // e.g. "1:1", "16:9", "4:3"
  resolution: string; // e.g. "1024x1024", "1920x1080"
  creativity: number; // 0 to 1
  guidanceStrength: number; // 1 to 20
  seed?: number;
  negativePrompt?: string;
}

export interface GenerationResult {
  imageUrl: string;
  seed: number;
  timeMs: number;
  parameters: ImageGenerationOptions;
}

export interface PromptInputs {
  shapes: string[];
  annotations: string[];
  stylePreference?: string;
}

export interface ModelProviderAdapter {
  id: string;
  name: string;
  generate(prompt: string, options: ImageGenerationOptions): Promise<string>;
}

export interface GenerationHistoryItem {
  id: string;
  prompt: string;
  result: GenerationResult;
  createdAt: number;
}
