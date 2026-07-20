export interface MaskRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MaskDetails {
  region: MaskRegion;
  type: "inpaint" | "outpaint" | "partial-regeneration";
  transparent: boolean;
  alphaMapUrl: string | undefined;
}

export class MaskManager {
  /**
   * Generates a canvas mask configuration checking sizes and compiling masks URLs.
   */
  public createMask(region: MaskRegion, type: MaskDetails["type"], transparent = false): MaskDetails {
    if (region.w <= 0 || region.h <= 0) {
      throw new Error("ValidationException: Mask dimensions width and height must be positive");
    }

    return {
      region,
      type,
      transparent,
      alphaMapUrl: transparent ? `https://assets.visioncanvas.ai/masks/transparent_${region.w}x${region.h}.png` : undefined
    };
  }

  /**
   * Modifies an existing mask details metadata structure.
   */
  public updateMaskRegion(mask: MaskDetails, newRegion: MaskRegion): MaskDetails {
    return {
      ...mask,
      region: newRegion
    };
  }
}
