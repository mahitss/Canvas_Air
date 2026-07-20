import { GenerationResult } from "../types";

export interface IntegratedImageObject {
  id: string;
  type: "image";
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  properties: {
    title: string;
    generatedMetadata: {
      seed: number;
      timeMs: number;
      style: string;
    };
  };
}

export class ImageIntegrationManager {
  private historyStack: IntegratedImageObject[][] = [[]];
  private historyIndex = 0;

  /**
   * Translates a generation result into a platform canvas image object with embedded metadata.
   */
  public createCanvasImageObject(result: GenerationResult, bounds?: { x: number; y: number; w: number; h: number }): IntegratedImageObject {
    return {
      id: `gen-image-${result.seed}-${Date.now()}`,
      type: "image",
      src: result.imageUrl,
      x: bounds?.x ?? 0,
      y: bounds?.y ?? 0,
      w: bounds?.w ?? 512,
      h: bounds?.h ?? 512,
      properties: {
        title: `AI Generated ${result.parameters.style}`,
        generatedMetadata: {
          seed: result.seed,
          timeMs: result.timeMs,
          style: result.parameters.style
        }
      }
    };
  }

  // Undo/Redo stack manager
  public recordState(state: IntegratedImageObject[]): void {
    // Truncate future states if recording after an undo
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    this.historyStack.push(state.map((img) => ({ ...img })));
    this.historyIndex++;
  }

  public undo(): IntegratedImageObject[] | null {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.historyStack[this.historyIndex] || [];
    }
    return null;
  }

  public redo(): IntegratedImageObject[] | null {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      return this.historyStack[this.historyIndex] || [];
    }
    return null;
  }
}
