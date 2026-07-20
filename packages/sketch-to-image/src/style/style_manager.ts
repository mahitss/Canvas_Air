export interface ImageStyle {
  name: string;
  positivePromptModifier: string;
  negativePromptModifier: string;
}

export class StyleManager {
  private readonly styles = new Map<string, ImageStyle>();

  constructor() {
    // Register default styles
    this.registerStyle({
      name: "Photorealistic",
      positivePromptModifier: "photorealistic, hyperrealistic, 8k resolution, cinematic lighting, dslr quality",
      negativePromptModifier: "3d render, cartoon, anime, drawing, painting, blurry, low quality"
    });
    this.registerStyle({
      name: "Digital Art",
      positivePromptModifier: "digital art, clean strokes, vibrant color palette, artstation style, sharp details",
      negativePromptModifier: "photograph, traditional sketch, watercolor, low quality"
    });
    this.registerStyle({
      name: "Watercolor",
      positivePromptModifier: "watercolor painting, soft brush strokes, fluid colors, paper texture, elegant flow",
      negativePromptModifier: "photorealistic, sharp lines, render, low quality"
    });
    this.registerStyle({
      name: "Pencil Sketch",
      positivePromptModifier: "pencil sketch drawing, graphite shades, crosshatching texture, artistic paper lines",
      negativePromptModifier: "color render, digital painting, photorealism, low quality"
    });
    this.registerStyle({
      name: "Cartoon",
      positivePromptModifier: "cartoon vector style, 2d animation layout, smooth outlines, flat shading colors",
      negativePromptModifier: "realistic details, cinematic photography, low quality"
    });
    this.registerStyle({
      name: "Concept Art",
      positivePromptModifier: "sci-fi concept art, dramatic composition, painterly textures, atmospheric backdrop",
      negativePromptModifier: "simple cartoon, family photography, low quality"
    });
    this.registerStyle({
      name: "Pixel Art",
      positivePromptModifier: "pixel art design, 8-bit retro gaming aesthetic, blocky textures, saturated color tones",
      negativePromptModifier: "smooth gradients, high resolution photograph, blurry, low quality"
    });
  }

  public registerStyle(style: ImageStyle): void {
    if (!style.name || style.name.trim().length === 0) {
      throw new Error("ValidationException: Style name must be defined");
    }
    this.styles.set(style.name.toLowerCase(), style);
  }

  public getStyle(name: string): ImageStyle | null {
    return this.styles.get(name.toLowerCase()) || null;
  }

  public getRegisteredStyles(): string[] {
    return Array.from(this.styles.values()).map((s) => s.name);
  }

  public validateStyleName(name: string): boolean {
    return this.styles.has(name.toLowerCase());
  }
}
