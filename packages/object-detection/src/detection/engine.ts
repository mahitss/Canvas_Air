import { DetectionModelProvider, DetectedObject, SceneGraph, SegmentationMask } from "../types";
import { TrackingEngine } from "../tracking/engine";
import { SceneGraphManager } from "../graph/manager";
import { SegmentationEngine } from "../segmentation/engine";

export class ObjectDetectionEngine {
  private providers: Map<string, DetectionModelProvider> = new Map();
  private activeProviderId: string | null = null;
  private tracker: TrackingEngine;
  private graphManager: SceneGraphManager;
  private segmenter: SegmentationEngine;

  constructor() {
    this.tracker = new TrackingEngine();
    this.graphManager = new SceneGraphManager();
    this.segmenter = new SegmentationEngine();
  }

  public registerProvider(provider: DetectionModelProvider): void {
    this.providers.set(provider.id, provider);
    if (!this.activeProviderId) {
      this.activeProviderId = provider.id;
    }
  }

  public selectProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Cannot select unregistered detection provider: ${id}`);
    }
    this.activeProviderId = id;
  }

  /**
   * Main pipeline runner: fetches bounding boxes, then tracks centroids persistence.
   */
  public async detectObjects(imageUri: string): Promise<DetectedObject[]> {
    if (!this.activeProviderId) {
      throw new Error("No object detection providers registered inside ObjectDetectionEngine.");
    }
    const provider = this.providers.get(this.activeProviderId)!;

    // 1. Fetch raw bounding box classifications
    const rawObjects = await provider.detect(imageUri);

    // 2. Map temporal ID tracking
    return this.tracker.trackObjects(rawObjects);
  }

  public generateSceneGraph(objects: DetectedObject[]): SceneGraph {
    return this.graphManager.generateSceneGraph(objects);
  }

  public generateMasks(objects: DetectedObject[]): SegmentationMask[] {
    return this.segmenter.generateMasks(objects);
  }
}
