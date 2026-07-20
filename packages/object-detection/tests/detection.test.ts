import { describe, it, expect, beforeEach } from "vitest";
import { ObjectDetectionEngine } from "../src/detection/engine";
import { DetectionModelProvider, DetectedObject } from "../src/types";

class MockDetectionProvider implements DetectionModelProvider {
  public id = "mock-detection-provider";
  public name = "Mock Object Detector";
  public mockDetections: DetectedObject[] = [];

  public async detect(imageUri: string): Promise<DetectedObject[]> {
    void imageUri;
    return this.mockDetections;
  }
}

describe("Object Detection & Scene Understanding Platform", () => {
  let engine: ObjectDetectionEngine;
  let provider: MockDetectionProvider;

  beforeEach(() => {
    engine = new ObjectDetectionEngine();
    provider = new MockDetectionProvider();
    engine.registerProvider(provider);
  });

  it("should assign persistent tracking IDs across consecutive detection frames", async () => {
    // Frame 1: Object at (100, 100)
    provider.mockDetections = [
      { id: "obj-1", label: "person", confidence: 0.9, x: 100, y: 100, w: 50, h: 100 }
    ];

    const frame1Result = await engine.detectObjects("frame1.png");
    expect(frame1Result.length).toBe(1);
    
    const trackingId1 = frame1Result[0].trackingId;
    expect(trackingId1).toBeDefined();

    // Frame 2: Object moves slightly to (110, 105)
    provider.mockDetections = [
      { id: "obj-2", label: "person", confidence: 0.9, x: 110, y: 105, w: 50, h: 100 }
    ];

    const frame2Result = await engine.detectObjects("frame2.png");
    expect(frame2Result.length).toBe(1);
    
    const trackingId2 = frame2Result[0].trackingId;
    expect(trackingId2).toBe(trackingId1); // Tracking ID is persisted
  });

  it("should establish containment and overlaps spatial relations in Scene Graphs", () => {
    const detected: DetectedObject[] = [
      { id: "board", label: "whiteboard", confidence: 0.95, x: 50, y: 50, w: 400, h: 300 },
      { id: "sticker", label: "note", confidence: 0.88, x: 100, y: 100, w: 50, h: 50 }, // Inside whiteboard
      { id: "cup", label: "mug", confidence: 0.80, x: 420, y: 320, w: 60, h: 60 } // Overlaps bottom-right corner
    ];

    const sceneGraph = engine.generateSceneGraph(detected);
    expect(sceneGraph.nodes.length).toBe(3);

    const rels = sceneGraph.relationships;
    expect(rels.length).toBe(4); // 2 pairs of directional relations (containment + overlaps)

    const containment = rels.find(r => r.fromId === "sticker" && r.toId === "board");
    expect(containment?.type).toBe("containment");

    const overlap = rels.find(r => r.fromId === "cup" && r.toId === "board");
    expect(overlap?.type).toBe("overlap");
  });

  it("should compute contour points definitions for instance outlines segmentations", () => {
    const detected: DetectedObject[] = [
      { id: "box", label: "monitor", confidence: 0.9, x: 10, y: 10, w: 100, h: 80 }
    ];

    const masks = engine.generateMasks(detected);
    expect(masks.length).toBe(1);
    
    const mask = masks[0];
    expect(mask.contourPoints.length).toBe(4);
    expect(mask.contourPoints[0]).toEqual({ x: 10, y: 10 });
    expect(mask.contourPoints[2]).toEqual({ x: 110, y: 90 });
  });
});
