import { ImageGenerationOptions } from "../types";


export interface IImageGenerationProvider {
  id: string;
  name: string;
  type: "local" | "cloud" | "llm";
  initialize(): Promise<void>;
  generate(prompt: string, options: ImageGenerationOptions, abortSignal?: AbortSignal): Promise<string>;
  cancel(requestId: string): Promise<void>;
  health(): Promise<"healthy" | "degraded" | "down">;
  dispose(): Promise<void>;
}

export class DefaultImageGenerationProvider implements IImageGenerationProvider {
  public readonly id = "default-provider";
  public readonly name = "Default Mock Stable Diffusion";
  public readonly type = "cloud";
  private initialized = false;
  private activeRequestIds = new Set<string>();

  public async initialize(): Promise<void> {
    this.initialized = true;
  }

  public async generate(prompt: string, options: ImageGenerationOptions, abortSignal?: AbortSignal): Promise<string> {
    void prompt;
    if (!this.initialized) {
      throw new Error("ProviderNotInitializedException");
    }

    const requestId = options.seed?.toString() || Math.random().toString();
    this.activeRequestIds.add(requestId);

    // Support abort signal
    if (abortSignal?.aborted) {
      this.activeRequestIds.delete(requestId);
      throw new Error("AbortError: Image generation cancelled");
    }

    // Mock generative delay
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve();
      }, 50);

      abortSignal?.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(new Error("AbortError: Image generation cancelled"));
      });
    });

    this.activeRequestIds.delete(requestId);
    return `https://images.visioncanvas.ai/generated/${options.seed || "1"}.png`;
  }

  public async cancel(requestId: string): Promise<void> {
    this.activeRequestIds.delete(requestId);
  }

  public async health(): Promise<"healthy" | "degraded" | "down"> {
    return this.initialized ? "healthy" : "down";
  }

  public async dispose(): Promise<void> {
    this.activeRequestIds.clear();
    this.initialized = false;
  }
}
