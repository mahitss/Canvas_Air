import { describe, it, expect } from "vitest";
import { SceneGraph } from "../src/scene/graph";
import { LayerManager } from "../src/layer/manager";
import { RenderIntegrationOrchestrator, IDrawingEngineIntegration, IShapeRecognitionIntegration } from "../src/integration/orchestrator";

describe("Renderer Integration Orchestrator Layer", () => {
  it("should sync drawing engine strokes to the scene graph drawing layer node", () => {
    const scene = new SceneGraph();
    const layerManager = new LayerManager(scene);

    // Setup rendering layers
    layerManager.addLayer({ id: "drawing", name: "Drawing", type: "Drawing", visible: true, opacity: 1.0, zIndex: 10 });

    // Mock drawing engine with subscribers map
    const subscribers: Record<string, (event: any) => void> = {};
    const mockDrawingEngine: IDrawingEngineIntegration = {
      eventBus: {
        subscribe: (type, callback) => {
          subscribers[type] = callback;
          return () => {};
        }
      },
      getStrokes: () => [],
      layers: {
        getActiveLayerId: () => "drawing",
        getLayers: () => [{ id: "drawing", name: "Drawing", isVisible: true, opacity: 1.0 }]
      }
    };

    // Mock shape engine
    const mockShapeEngine: IShapeRecognitionIntegration = {
      subscribe: () => () => {}
    };

    const orchestrator = new RenderIntegrationOrchestrator(scene, layerManager, mockDrawingEngine, mockShapeEngine);
    orchestrator.start();

    // Trigger stroke started event
    expect(subscribers["StrokeStarted"]).toBeDefined();
    subscribers["StrokeStarted"]({
      type: "StrokeStarted",
      payload: { strokeId: "test-stroke", layerId: "drawing" },
      timestamp: 100
    });

    // Stroke node must be added to the scene graph under the drawing layer!
    const strokeNode = scene.findNode("test-stroke");
    expect(strokeNode).toBeDefined();
    expect(strokeNode!.type).toBe("StrokeNode");
    expect(strokeNode!.parent!.id).toBe("drawing");
  });

  it("should replace completed stroke paths with vector shape nodes upon prediction completed", () => {
    const scene = new SceneGraph();
    const layerManager = new LayerManager(scene);

    layerManager.addLayer({ id: "drawing", name: "Drawing", type: "Drawing", visible: true, opacity: 1.0, zIndex: 10 });
    layerManager.addLayer({ id: "shapes", name: "Shapes", type: "Shapes", visible: true, opacity: 1.0, zIndex: 20 });

    const subscribers: Record<string, (event: any) => void> = {};
    const mockDrawingEngine: IDrawingEngineIntegration = {
      eventBus: {
        subscribe: (type, callback) => {
          subscribers[type] = callback;
          return () => {};
        }
      },
      getStrokes: () => [],
      layers: {
        getActiveLayerId: () => "drawing",
        getLayers: () => [
          { id: "drawing", name: "Drawing", isVisible: true, opacity: 1.0 },
          { id: "shapes", name: "Shapes", isVisible: true, opacity: 1.0 }
        ]
      }
    };

    let shapeSubscriber: ((event: any) => void) | null = null;
    const mockShapeEngine: IShapeRecognitionIntegration = {
      subscribe: (callback) => {
        shapeSubscriber = callback;
        return () => {};
      }
    };

    const orchestrator = new RenderIntegrationOrchestrator(scene, layerManager, mockDrawingEngine, mockShapeEngine);
    orchestrator.start();

    // 1. Draw a stroke
    subscribers["StrokeStarted"]({
      type: "StrokeStarted",
      payload: { strokeId: "stroke-123", layerId: "drawing" },
      timestamp: 100
    });

    expect(scene.findNode("stroke-123")).toBeDefined();

    // 2. Predict shape completed
    shapeSubscriber!({
      type: "RecognitionCompleted",
      payload: {
        strokeId: "stroke-123",
        prediction: { shapeType: "circle", confidence: 0.95 }
      },
      timestamp: 110
    });

    // Raw stroke must be deleted, and a vector shape node added under the shapes layer!
    expect(scene.findNode("stroke-123")).toBeNull();

    const shapeNode = scene.findNode("shape-stroke-123");
    expect(shapeNode).toBeDefined();
    expect(shapeNode!.type).toBe("ShapeNode");
    expect((shapeNode as any).shapeType).toBe("circle");
    expect(shapeNode!.parent!.id).toBe("shapes");
  });

  it("should sync drawing layers visibility to backing rendering layers node", () => {
    const scene = new SceneGraph();
    const layerManager = new LayerManager(scene);

    layerManager.addLayer({ id: "drawing", name: "Drawing", type: "Drawing", visible: true, opacity: 1.0, zIndex: 10 });

    const subscribers: Record<string, (event: any) => void> = {};
    const mockDrawingEngine: IDrawingEngineIntegration = {
      eventBus: {
        subscribe: (type, callback) => {
          subscribers[type] = callback;
          return () => {};
        }
      },
      getStrokes: () => [],
      layers: {
        getActiveLayerId: () => "drawing",
        getLayers: () => [
          { id: "drawing", name: "Drawing", isVisible: false, opacity: 0.5 }
        ]
      }
    };

    const mockShapeEngine: IShapeRecognitionIntegration = {
      subscribe: () => () => {}
    };

    const orchestrator = new RenderIntegrationOrchestrator(scene, layerManager, mockDrawingEngine, mockShapeEngine);
    orchestrator.start();

    // Trigger full sync
    subscribers["CanvasChanged"](null);

    const layerNode = layerManager.getLayerNode("drawing")!;
    expect(layerNode.isVisible).toBe(false);
    expect(layerNode.opacity).toBe(0.5);
  });
});
