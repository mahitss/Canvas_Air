import { describe, it, expect } from "vitest";
import { SegmentationEngine } from "../src/segmentation/engine";
import { TrackingEngine } from "../src/tracking/engine";
import { SpatialReasoningEngine } from "../src/spatial/spatial_engine";
import { SceneClassifier } from "../src/scene/classifier";
import { SceneKnowledgeModel } from "../src/knowledge/knowledge_model";
import { DetectedObject } from "../src/types";

describe("Object Detection Advanced Components (Spatial, Tracking, Segment, Scene Classifier)", () => {
  it("should generate semantic segmentation, background masks, and crops", () => {
    const segmenter = new SegmentationEngine();

    const sem = segmenter.generateSemanticSegmentation("local://photo.jpg");
    expect(sem.length).toBe(2);
    expect(sem[0]?.label).toBe("foreground-person");

    const masked = segmenter.applyBackgroundMask("local://photo.jpg");
    expect(masked).toContain("background-masked=true");

    const cropped = segmenter.extractRegion("local://photo.jpg", { x: 10, y: 10, w: 100, h: 50 });
    expect(cropped).toContain("crop=10,10,100,50");
  });

  it("should track trajectories, predict motion, and handle occlusions", () => {
    const tracker = new TrackingEngine();

    const frame1: DetectedObject[] = [
      { id: "o1", label: "person", confidence: 0.9, x: 10, y: 10, w: 50, h: 50 }
    ];

    const tracked1 = tracker.trackObjects(frame1);
    const trackId = tracked1[0]?.trackingId;
    expect(trackId).toBeDefined();

    // Frame 2: object moves
    const frame2: DetectedObject[] = [
      { id: "o2", label: "person", confidence: 0.9, x: 20, y: 20, w: 50, h: 50 }
    ];
    const tracked2 = tracker.trackObjects(frame2);
    expect(tracked2[0]?.trackingId).toBe(trackId);

    // Frame 3: Object gets occluded (missing from current detections)
    const tracked3 = tracker.trackObjects([]);
    expect(tracked3.length).toBe(0);

    // Trajectory should still exist in memory due to occlusion recovery
    const trajectories = tracker.getTrajectories();
    expect(trajectories.has(trackId!)).toBe(true);
  });

  it("should infer containment, overlap, and direction relationships", () => {
    const spatial = new SpatialReasoningEngine();

    const objects: DetectedObject[] = [
      { id: "a", label: "container", confidence: 0.9, x: 0, y: 0, w: 200, h: 200 },
      { id: "b", label: "inner", confidence: 0.9, x: 50, y: 50, w: 50, h: 50 },
      { id: "c", label: "right", confidence: 0.9, x: 250, y: 0, w: 50, h: 50 }
    ];

    const relationships = spatial.inferRelationships(objects);
    const contains = relationships.find(r => r.relation === "contains");
    expect(contains?.sourceId).toBe("a");
    expect(contains?.targetId).toBe("b");
  });

  it("should classify scenes based on object label structures", () => {
    const classifier = new SceneClassifier();

    const scene = classifier.classifyScene(["marker", "whiteboard", "chair"]);
    expect(scene.sceneType).toBe("Whiteboard");
    expect(scene.confidence).toBe(0.94);

    const deskScene = classifier.classifyScene(["computer", "desk"]);
    expect(deskScene.sceneType).toBe("Desk");
  });

  it("should record attributes and frames history logs inside knowledge models", () => {
    const model = new SceneKnowledgeModel();
    expect(model.getVersionDetails().version).toBe("1.0.0");

    model.setAttributes("obj-1", { color: "red", state: "active" });
    expect(model.getAttributes("obj-1")?.color).toBe("red");

    model.logFrameHistory([{ id: "obj-1", label: "item", confidence: 0.95, x: 0, y: 0, w: 10, h: 10 }]);
    expect(model.getFrameHistory().length).toBe(1);
  });
});
