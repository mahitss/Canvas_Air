import { GpuAllocationError } from "../errors";

export interface IAtlasRect {
  x: number;
  y: number;
  width: number;
  height: number;
  uMin: number;
  vMin: number;
  uMax: number;
  vMax: number;
}

/**
 * TextureAtlas packs multiple sub-texture sheets into a single GPU texture canvas target,
 * reducing dynamic texture binding context switches.
 */
export class TextureAtlas {
  private readonly allocations = new Map<string, IAtlasRect>();
  
  // Shelf packing tracker state
  private shelfX = 0;
  private shelfY = 0;
  private shelfHeight = 0;

  constructor(
    public readonly width: number = 2048,
    public readonly height: number = 2048
  ) {}

  /**
   * Packs a new texture into the atlas and returns its UV mapping coordinate bounds.
   */
  public pack(id: string, subWidth: number, subHeight: number): IAtlasRect {
    const cached = this.allocations.get(id);
    if (cached) {
      return cached;
    }

    // Check if sub-texture exceeds atlas width
    if (subWidth > this.width || subHeight > this.height) {
      throw new GpuAllocationError(`Sub-texture dimensions [${subWidth}x${subHeight}] exceed atlas dimensions [${this.width}x${this.height}].`);
    }

    // Shelf packing logic: check if sub-texture fits on current shelf
    if (this.shelfX + subWidth > this.width) {
      // Advance to next shelf
      this.shelfY += this.shelfHeight;
      this.shelfX = 0;
      this.shelfHeight = 0;
    }

    // Check if we exceeded the atlas height boundary
    if (this.shelfY + subHeight > this.height) {
      throw new GpuAllocationError("TextureAtlas has run out of space to pack new textures.");
    }

    const x = this.shelfX;
    const y = this.shelfY;

    // Advance shelf trackers
    this.shelfX += subWidth;
    this.shelfHeight = Math.max(this.shelfHeight, subHeight);

    // Compute normalized coordinates
    const rect: IAtlasRect = {
      x,
      y,
      width: subWidth,
      height: subHeight,
      uMin: x / this.width,
      vMin: y / this.height,
      uMax: (x + subWidth) / this.width,
      vMax: (y + subHeight) / this.height
    };

    this.allocations.set(id, rect);
    return rect;
  }

  /**
   * Retrieves mapped UV coordinate rect details for a packed texture ID.
   */
  public get(id: string): IAtlasRect | null {
    return this.allocations.get(id) || null;
  }

  /**
   * Clears all packed textures mappings.
   */
  public clear(): void {
    this.allocations.clear();
    this.shelfX = 0;
    this.shelfY = 0;
    this.shelfHeight = 0;
  }

  /**
   * Retrieves the current number of packed allocations.
   */
  public get count(): number {
    return this.allocations.size;
  }
}
