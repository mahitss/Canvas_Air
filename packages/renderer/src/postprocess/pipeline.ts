import { RendererConfig } from "../config";

export class PostProcessPipeline {
  private config: RendererConfig;

  constructor(config: RendererConfig) {
    this.config = config;
  }

  /**
   * Applies the enabled post-processing filters chain to the destination rendering context.
   */
  public applyFilters(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    if (!this.config.postProcessingEnabled) {
      return;
    }

    const w = canvas.width;
    const h = canvas.height;

    // 1. Bloom / Glow filter approximation
    if (this.config.bloomEnabled || this.config.glowEnabled) {
      ctx.save();
      // Use lighten blend mode to overlap bright colors mimicking light bleed emission
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.15;
      
      // Draw offset copies to simulate blur bloom glow
      ctx.drawImage(canvas, -2, -2);
      ctx.drawImage(canvas, 2, 2);
      
      ctx.restore();
    }

    // 2. Vignette effect filter mapping
    if (this.config.vignetteEnabled) {
      ctx.save();
      const gradient = ctx.createRadialGradient(
        w / 2, h / 2, Math.min(w, h) * 0.5,
        w / 2, h / 2, Math.max(w, h) * 0.9
      );
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
}
