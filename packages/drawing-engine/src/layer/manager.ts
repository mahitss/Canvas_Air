import { CanvasLayer } from "../types";
import { DrawingEngineConfig } from "../config";
import { ILayerManager } from "../interfaces";

export class LayerManager implements ILayerManager {
  private config: DrawingEngineConfig;
  private layers: CanvasLayer[] = [];
  private activeLayerId: string | null = null;
  private dirty = false;

  constructor(config: DrawingEngineConfig) {
    this.config = config;
    
    // Auto-create a default base layer
    this.addLayer("Background Layer");
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public getLayers(): CanvasLayer[] {
    return [...this.layers];
  }

  public getActiveLayerId(): string | null {
    return this.activeLayerId;
  }

  public setActiveLayer(id: string): void {
    const exists = this.layers.some(l => l.id === id);
    if (exists && this.activeLayerId !== id) {
      this.activeLayerId = id;
      this.dirty = true;
    }
  }

  public addLayer(name: string): CanvasLayer {
    const limit = this.config.layerLimit;
    if (limit > 0 && this.layers.length >= limit) {
      throw new Error(`Layer limit reached: max ${limit} layers allowed.`);
    }

    const layer: CanvasLayer = {
      id: `layer-${Math.random().toString(36).substr(2, 9)}`,
      name,
      opacity: 1.0,
      isVisible: true,
      isLocked: false,
      blendMode: "source-over"
    };

    this.layers.push(layer);
    this.dirty = true;
    
    // If no active layer exists, assign it
    if (!this.activeLayerId) {
      this.activeLayerId = layer.id;
    }

    return layer;
  }

  public removeLayer(id: string): void {
    if (this.layers.length <= 1) {
      throw new Error("Cannot delete the last layer in canvas.");
    }

    const index = this.layers.findIndex(l => l.id === id);
    if (index !== -1) {
      this.layers.splice(index, 1);
      this.dirty = true;
      
      // If deleted active layer, re-assign active layer
      if (this.activeLayerId === id) {
        // Fall back to nearest available layer
        const fallbackIdx = Math.max(0, index - 1);
        this.activeLayerId = this.layers[fallbackIdx]!.id;
      }
    }
  }

  public renameLayer(id: string, name: string): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer && layer.name !== name) {
      layer.name = name;
      this.dirty = true;
    }
  }

  public reorderLayer(id: string, newIndex: number): void {
    const index = this.layers.findIndex(l => l.id === id);
    if (index === -1) {
      return;
    }
    
    const targetIdx = Math.max(0, Math.min(this.layers.length - 1, newIndex));
    if (index === targetIdx) {
      return;
    }

    const [layer] = this.layers.splice(index, 1);
    this.layers.splice(targetIdx, 0, layer!);
    this.dirty = true;
  }

  public setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      const clamped = Math.max(0.0, Math.min(1.0, opacity));
      if (layer.opacity !== clamped) {
        layer.opacity = clamped;
        this.dirty = true;
      }
    }
  }

  public setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer && layer.isVisible !== visible) {
      layer.isVisible = visible;
      this.dirty = true;
    }
  }

  public setLayerLock(id: string, locked: boolean): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer && layer.isLocked !== locked) {
      layer.isLocked = locked;
      this.dirty = true;
    }
  }

  public setLayerBlendMode(id: string, blendMode: GlobalCompositeOperation): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer && layer.blendMode !== blendMode) {
      layer.blendMode = blendMode;
      this.dirty = true;
    }
  }

  public clear(): void {
    this.layers = [];
    this.activeLayerId = null;
    this.addLayer("Background Layer");
    this.dirty = true;
  }
}
