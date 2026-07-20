import { IImageGenerationProvider } from "../adapters/provider_framework";
import { ImageGenerationOptions, GenerationResult } from "../types";

export interface GenerationProgress {
  requestId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  percent: number;
}

export class ImageGenerationManager {
  private activeProvider: IImageGenerationProvider | null = null;
  private readonly progressCallbacks = new Map<string, (progress: GenerationProgress) => void>();

  public setProvider(provider: IImageGenerationProvider): void {
    this.activeProvider = provider;
  }

  public getProvider(): IImageGenerationProvider | null {
    return this.activeProvider;
  }

  public onProgress(requestId: string, callback: (progress: GenerationProgress) => void): void {
    this.progressCallbacks.set(requestId, callback);
  }

  /**
   * Dispatches generation task to provider with retry policies, cancellation options,
   * progress milestones tracking and timeouts.
   */
  public async generateImageWithPolicies(
    prompt: string,
    options: ImageGenerationOptions,
    abortSignal?: AbortSignal,
    policies?: { retries?: number; timeoutMs?: number }
  ): Promise<GenerationResult> {
    if (!this.activeProvider) {
      throw new Error("No active generative image provider configured");
    }

    const requestId = options.seed?.toString() || Math.random().toString();
    const retries = policies?.retries ?? 2;
    const timeoutMs = policies?.timeoutMs ?? 10000;

    let attempt = 0;
    let lastError: any = null;

    while (attempt <= retries) {
      if (abortSignal?.aborted) {
        this.emitProgress(requestId, "cancelled", 0);
        throw new Error("AbortError: Generation cancelled");
      }

      this.emitProgress(requestId, attempt === 0 ? "pending" : "processing", 10 * attempt);

      // Create a timeout signal
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      abortSignal?.addEventListener("abort", onAbort);

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const startTime = Date.now();
        const imageUrl = await this.activeProvider.generate(prompt, options, controller.signal);
        const timeMs = Date.now() - startTime;

        this.emitProgress(requestId, "completed", 100);

        return {
          imageUrl,
          seed: options.seed || 1,
          timeMs,
          parameters: options
        };
      } catch (err: any) {
        lastError = err;
        attempt++;
        this.emitProgress(requestId, "failed", 10 * attempt);
      } finally {
        clearTimeout(timeoutId);
        abortSignal?.removeEventListener("abort", onAbort);
      }
    }

    throw new Error(`Generation failed after ${retries} retries. Last error: ${lastError?.message || lastError}`);
  }

  private emitProgress(requestId: string, status: GenerationProgress["status"], percent: number): void {
    const cb = this.progressCallbacks.get(requestId);
    if (cb) {
      cb({ requestId, status, percent });
    }
  }
}
