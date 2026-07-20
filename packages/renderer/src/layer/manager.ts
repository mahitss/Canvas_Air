import { ILayer, ILayerManager } from "../interfaces";
import { SceneGraph } from "../scene/graph";
import { SceneNode } from "../scene/node";

/**
 * LayerManager coordinates adding, removing, and toggling visual layer properties.
 * Optionally integrates with the SceneGraph to establish container nodes.
 */
export class LayerManager implements ILayerManager {
  private layers: Map<string, ILayer> = new Map();
  // Map layer ID to backing SceneNode container
  private layerNodes: Map<string, SceneNode> = new Map();

  constructor(private readonly sceneGraph?: SceneGraph) {}

  /**
   * Registers a rendering layer.
   * If a SceneGraph was provided in the constructor, a container node is generated.
   */
  public addLayer(layer: ILayer): void {
    if (this.layers.has(layer.id)) {
      throw new Error(`Layer with ID '${layer.id}' is already registered.`);
    }

    this.layers.set(layer.id, { ...layer });

    if (this.sceneGraph) {
      const root = this.sceneGraph.getRoot();
      const node = new SceneNode(layer.id, "LayerNode");
      node.isVisible = layer.visible;
      node.opacity = layer.opacity;
      
      // We will mount it under the root, keeping children sorted by zIndex later
      root.addChild(node);
      this.layerNodes.set(layer.id, node);
      this.sortSceneGraphLayers();
    }
  }

  /**
   * Removes a layer and its corresponding scene nodes.
   */
  public removeLayer(id: string): void {
    this.layers.delete(id);
    const node = this.layerNodes.get(id);
    if (node && this.sceneGraph) {
      this.sceneGraph.getRoot().removeChild(node);
      this.layerNodes.delete(id);
    }
  }

  /**
   * Toggles layer visibility, propagating values to scene nodes.
   */
  public setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.get(id);
    if (!layer) return;

    layer.visible = visible;
    const node = this.layerNodes.get(id);
    if (node) {
      node.isVisible = visible;
    }
  }

  /**
   * Sets layer opacity, propagating values to scene nodes.
   */
  public setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.get(id);
    if (!layer) return;

    layer.opacity = opacity;
    const node = this.layerNodes.get(id);
    if (node) {
      node.opacity = opacity;
    }
  }

  /**
   * Returns all active layers sorted by zIndex ascending.
   */
  public getLayers(): ILayer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  public getLayerById(id: string): ILayer | undefined {
    return this.layers.get(id);
  }

  /**
   * Returns the backing SceneNode for the specified layer (if using SceneGraph).
   */
  public getLayerNode(id: string): SceneNode | undefined {
    return this.layerNodes.get(id);
  }

  /**
   * Sorts the children of the root SceneNode based on layer zIndex weights.
   */
  private sortSceneGraphLayers(): void {
    if (!this.sceneGraph) return;

    const root = this.sceneGraph.getRoot();
    
    // Sort child container nodes according to their layer zIndex values
    root.children.sort((a, b) => {
      const layerA = this.layers.get(a.id);
      const layerB = this.layers.get(b.id);
      const zA = layerA ? layerA.zIndex : 0;
      const zB = layerB ? layerB.zIndex : 0;
      return zA - zB;
    });

    root.setDirty();
  }
}
