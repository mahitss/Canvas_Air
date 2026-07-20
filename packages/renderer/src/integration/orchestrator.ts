import { SceneGraph } from "../scene/graph";
import { SceneNode } from "../scene/node";
import { LayerManager } from "../layer/manager";

export interface IDrawingStrokePoint {
  x: number;
  y: number;
}

export interface IDrawingStrokeData {
  id: string;
  points: IDrawingStrokePoint[];
  layerId: string;
}

export interface IDrawingEngineIntegration {
  eventBus: {
    subscribe(type: string, callback: (event: any) => void): () => void;
  };
  getStrokes(): IDrawingStrokeData[];
  layers: {
    getActiveLayerId(): string | null;
    getLayers(): Array<{ id: string; name: string; isVisible: boolean; opacity: number }>;
  };
}

export interface IShapePredictionIntegration {
  shapeType: string;
  confidence: number;
}

export interface IShapeRecognitionIntegration {
  subscribe(callback: (event: any) => void): () => void;
}

/**
 * RenderIntegrationOrchestrator acts as a Clean Architecture mediator bridge,
 * synchronizing drawing engine strokes and shape recognition predictions
 * directly to backing SceneNodes in the renderer SceneGraph without cross-coupling.
 */
export class RenderIntegrationOrchestrator {
  private unsubscribers: Array<() => void> = [];
  
  // Track active stroke nodes being drawn
  private activeStrokes: Map<string, SceneNode> = new Map();

  constructor(
    private readonly sceneGraph: SceneGraph,
    private readonly rendererLayerManager: LayerManager,
    private readonly drawingEngine: IDrawingEngineIntegration,
    private readonly shapeEngine: IShapeRecognitionIntegration
  ) {}

  /**
   * Subscribes to drawing and recognition events, starting active synchronization.
   */
  public start(): void {
    if (this.unsubscribers.length > 0) {
      return;
    }

    // 1. Subscribe to Drawing Stroke Start
    const unsubStarted = this.drawingEngine.eventBus.subscribe("StrokeStarted", (event: any) => {
      const { strokeId, layerId } = event.payload;
      
      const strokeNode = new SceneNode(strokeId, "StrokeNode");
      // Put under drawing layer node in SceneGraph
      const layerContainer = this.rendererLayerManager.getLayerNode(layerId) || this.sceneGraph.getRoot();
      layerContainer.addChild(strokeNode);
      
      this.activeStrokes.set(strokeId, strokeNode);
    });
    this.unsubscribers.push(unsubStarted);

    // 2. Subscribe to Drawing Stroke Updates
    const unsubUpdated = this.drawingEngine.eventBus.subscribe("StrokeUpdated", (event: any) => {
      const { strokeId, pointsCount } = event.payload;
      const node = this.activeStrokes.get(strokeId);
      if (node) {
        // Enlarge local bounds to represent active points collection sizes
        node.localBounds = {
          xMin: -pointsCount * 5,
          yMin: -pointsCount * 5,
          xMax: pointsCount * 5,
          yMax: pointsCount * 5
        };
        node.setDirty();
      }
    });
    this.unsubscribers.push(unsubUpdated);

    // 3. Subscribe to Drawing Stroke Cancellation
    const unsubCancelled = this.drawingEngine.eventBus.subscribe("StrokeCancelled", (event: any) => {
      const { strokeId } = event.payload;
      const node = this.activeStrokes.get(strokeId);
      if (node) {
        if (node.parent) {
          node.parent.removeChild(node);
        }
        this.activeStrokes.delete(strokeId);
      }
    });
    this.unsubscribers.push(unsubCancelled);

    // 4. Subscribe to Drawing Canvas Changes (Full sync rebuild)
    const unsubCanvas = this.drawingEngine.eventBus.subscribe("CanvasChanged", () => {
      this.synchronizeCompletedStrokes();
    });
    this.unsubscribers.push(unsubCanvas);

    // 5. Subscribe to Shape Recognition completions
    const unsubShape = this.shapeEngine.subscribe((event: any) => {
      if (event.type === "RecognitionCompleted") {
        const { strokeId, prediction } = event.payload;
        this.replaceStrokeWithShapeNode(strokeId, prediction);
      }
    });
    this.unsubscribers.push(unsubShape);
  }

  /**
   * Clean up all event subscriptions and bridges.
   */
  public stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.activeStrokes.clear();
  }

  /**
   * Rebuilds matching completed stroke nodes in the scene graph from drawing engine state.
   */
  public synchronizeCompletedStrokes(): void {
    // Remove all old completed stroke nodes (but keep active ones being drawn right now)
    const root = this.sceneGraph.getRoot();
    
    // Helper to traverse and clean completed nodes
    const removeCompleted = (parentNode: SceneNode) => {
      for (let i = parentNode.children.length - 1; i >= 0; i--) {
        const child = parentNode.children[i];
        if (child) {
          if (child.type === "StrokeNode" && !this.activeStrokes.has(child.id)) {
            parentNode.removeChild(child);
          } else {
            removeCompleted(child);
          }
        }
      }
    };
    removeCompleted(root);

    // Add back all completed strokes currently in drawing engine history
    const completedStrokes = this.drawingEngine.getStrokes();
    for (const stroke of completedStrokes) {
      const strokeNode = new SceneNode(stroke.id, "StrokeNode");
      const len = stroke.points.length;
      strokeNode.localBounds = {
        xMin: -len * 5,
        yMin: -len * 5,
        xMax: len * 5,
        yMax: len * 5
      };
      
      const layerContainer = this.rendererLayerManager.getLayerNode(stroke.layerId) || root;
      layerContainer.addChild(strokeNode);
    }

    // Sync visibility/opacities weights of layers
    const drawLayers = this.drawingEngine.layers.getLayers();
    for (const dl of drawLayers) {
      this.rendererLayerManager.setLayerVisibility(dl.id, dl.isVisible);
      this.rendererLayerManager.setLayerOpacity(dl.id, dl.opacity);
    }
  }

  /**
   * Substitutes a raw drawing stroke path node in the SceneGraph with a clean vector Shape node.
   */
  private replaceStrokeWithShapeNode(strokeId: string, prediction: IShapePredictionIntegration): void {
    const root = this.sceneGraph.getRoot();
    let foundParent: any = null;
    let targetStrokeNode: any = null;

    const findNode = (parent: SceneNode) => {
      for (const child of parent.children) {
        if (child.id === strokeId) {
          foundParent = parent;
          targetStrokeNode = child;
          return;
        }
        findNode(child);
      }
    };
    findNode(root);

    if (foundParent && targetStrokeNode) {
      // Remove raw stroke
      foundParent.removeChild(targetStrokeNode);
      this.activeStrokes.delete(strokeId);

      // Create new vector shape node under "Shapes" layer (or parent container fallback)
      const shapeNodeId = `shape-${strokeId}`;
      const shapeNode = new SceneNode(shapeNodeId, "ShapeNode");
      
      // Setup custom properties (for render pass checks)
      (shapeNode as any).shapeType = prediction.shapeType;
      
      // Let's mount the vector shape under shapes layer node if registered
      const shapesLayerNode = this.rendererLayerManager.getLayerNode("shapes") || foundParent;
      shapesLayerNode.addChild(shapeNode);
    }
  }
}
