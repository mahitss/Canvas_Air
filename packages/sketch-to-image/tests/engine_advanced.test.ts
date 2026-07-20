import { describe, it, expect, vi } from "vitest";
import { StyleManager } from "../src/style/style_manager";
import { DefaultImageGenerationProvider } from "../src/adapters/provider_framework";
import { ImageGenerationManager } from "../src/generation/generation_manager";
import { MaskManager } from "../src/mask/mask_manager";
import { PostProcessingPipeline } from "../src/postprocess/post_processing_pipeline";

describe("AI Sketch-to-Image Style, Generation Manager & Post-Process Pipelines", () => {
  it("should register, retrieve, and validate image styles", () => {
    const manager = new StyleManager();
    expect(manager.validateStyleName("Watercolor")).toBe(true);

    manager.registerStyle({
      name: "cyberpunk",
      positivePromptModifier: "cyberpunk neon lights",
      negativePromptModifier: "pastel colors"
    });

    expect(manager.validateStyleName("cyberpunk")).toBe(true);
    const style = manager.getStyle("CYBERPUNK");
    expect(style?.positivePromptModifier).toBe("cyberpunk neon lights");
  });

  it("should initialize default provider and verify health and dispose lifecycle states", async () => {
    const provider = new DefaultImageGenerationProvider();
    expect(await provider.health()).toBe("down");

    await provider.initialize();
    expect(await provider.health()).toBe("healthy");

    const img = await provider.generate("test prompt", {
      style: "Cartoon",
      aspectRatio: "1:1",
      resolution: "512",
      creativity: 0.5,
      guidanceStrength: 7,
      seed: 99
    });

    expect(img).toBe("https://images.visioncanvas.ai/generated/99.png");

    await provider.dispose();
    expect(await provider.health()).toBe("down");
  });

  it("should manage retries and execute timeout/progress callbacks during request lifecycle", async () => {
    const provider = new DefaultImageGenerationProvider();
    await provider.initialize();

    const manager = new ImageGenerationManager();
    manager.setProvider(provider);

    const progressHandler = vi.fn();
    manager.onProgress("123", progressHandler);

    const result = await manager.generateImageWithPolicies(
      "test",
      { style: "Watercolor", aspectRatio: "1:1", resolution: "512", creativity: 0.5, guidanceStrength: 5, seed: 123 },
      undefined,
      { retries: 1, timeoutMs: 1000 }
    );

    expect(result.imageUrl).toContain("123.png");
    expect(progressHandler).toHaveBeenCalled();
  });

  it("should create masks and validate region dimension bounds", () => {
    const maskService = new MaskManager();

    const mask = maskService.createMask({ x: 0, y: 0, w: 100, h: 200 }, "inpaint", true);
    expect(mask.transparent).toBe(true);
    expect(mask.alphaMapUrl).toBe("https://assets.visioncanvas.ai/masks/transparent_100x200.png");

    expect(() => maskService.createMask({ x: 0, y: 0, w: -5, h: 5 }, "inpaint")).toThrow();
  });

  it("should execute post-processing hooks for upscaling, background removal, and corrections", async () => {
    const pipeline = new PostProcessingPipeline();

    pipeline.registerUpscaleHook(async (url) => `${url}?upscaled=true`);
    pipeline.registerBackgroundRemovalHook(async (url) => `${url}&bg-removed=true`);

    const result = await pipeline.execute("https://original.png", {
      upscale: true,
      removeBg: true,
      correctColors: true,
      embedMetadata: true
    });

    expect(result.upscaled).toBe(true);
    expect(result.backgroundRemoved).toBe(true);
    expect(result.colorCorrected).toBe(true);
    expect(result.metadataEmbedded).toBe(true);
    expect(result.url).toContain("upscaled=true");
    expect(result.url).toContain("bg-removed=true");
  });
});
