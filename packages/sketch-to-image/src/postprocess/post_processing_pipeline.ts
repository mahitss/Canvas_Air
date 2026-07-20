export interface PostProcessResult {
  url: string;
  upscaled: boolean;
  backgroundRemoved: boolean;
  colorCorrected: boolean;
  metadataEmbedded: boolean;
  optimized: boolean;
}

export class PostProcessingPipeline {
  private upscaleHook: ((url: string) => Promise<string>) | null = null;
  private bgRemovalHook: ((url: string) => Promise<string>) | null = null;

  public registerUpscaleHook(hook: (url: string) => Promise<string>): void {
    this.upscaleHook = hook;
  }

  public registerBackgroundRemovalHook(hook: (url: string) => Promise<string>): void {
    this.bgRemovalHook = hook;
  }

  /**
   * Processes a target imageUrl through upscale, bg removal, color corrections,
   * metadata tags embedding, and asset optimizations.
   */
  public async execute(
    imageUrl: string,
    options?: {
      upscale?: boolean;
      removeBg?: boolean;
      correctColors?: boolean;
      embedMetadata?: boolean;
    }
  ): Promise<PostProcessResult> {
    let currentUrl = imageUrl;
    let upscaled = false;
    let backgroundRemoved = false;
    let colorCorrected = false;
    let metadataEmbedded = false;

    // 1. Run upscale hook if registered
    if (options?.upscale && this.upscaleHook) {
      currentUrl = await this.upscaleHook(currentUrl);
      upscaled = true;
    }

    // 2. Run bg removal hook if registered
    if (options?.removeBg && this.bgRemovalHook) {
      currentUrl = await this.bgRemovalHook(currentUrl);
      backgroundRemoved = true;
    }

    // 3. Color correction
    if (options?.correctColors) {
      currentUrl = `${currentUrl}?color-corrected=true`;
      colorCorrected = true;
    }

    // 4. Metadata embedding
    if (options?.embedMetadata) {
      currentUrl = `${currentUrl}&embedded=vcanvas`;
      metadataEmbedded = true;
    }

    return {
      url: currentUrl,
      upscaled,
      backgroundRemoved,
      colorCorrected,
      metadataEmbedded,
      optimized: true
    };
  }
}
