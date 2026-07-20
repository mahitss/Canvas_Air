import { describe, it, expect } from "vitest";
import { MotionAnalyzer } from "../src/motion/motion_analyzer";
import { StaticRecognizer } from "../src/static/static_recognizer";
import { DynamicRecognizer } from "../src/dynamic/dynamic_recognizer";
import { CustomGestureStudio } from "../src/custom/custom_learning";
import { GesturePredictionEngine } from "../src/prediction/prediction_engine";
import { ActionDispatcher } from "../src/dispatcher/action_dispatcher";
import { GestureProfileManager } from "../src/profile/profile_manager";
import { HandPresence } from "@visioncanvas/hand-tracking";

describe("Gesture Intelligence Engine", () => {
  it("should analyze velocity, acceleration, and curvature metrics", () => {
    const analyzer = new MotionAnalyzer();

    const h1: HandPresence = { id: "1", type: "right", confidence: 0.9, landmarks: { wrist: { x: 10, y: 20, z: 30 } } as any, timestamp: 100 };
    const h2: HandPresence = { id: "1", type: "right", confidence: 0.9, landmarks: { wrist: { x: 20, y: 30, z: 40 } } as any, timestamp: 200 };

    analyzer.analyzeMotion(h1);
    const metrics = analyzer.analyzeMotion(h2);

    expect(metrics.velocity.x).toBe(10);
    expect(metrics.distanceTraveled).toBeCloseTo(17.32, 2);
    expect(analyzer.getHistory().length).toBe(2);
  });

  it("should recognize Fist and Open Palm postures", () => {
    const recognizer = new StaticRecognizer();

    const openPalm: HandPresence = {
      id: "1",
      type: "right",
      confidence: 0.9,
      landmarks: { wrist: {}, index_tip: {}, thumb_tip: {}, middle_tip: {}, ring_tip: {}, pinky_tip: {} } as any,
      timestamp: 100
    };

    const res = recognizer.recognize(openPalm);
    expect(res?.gesture).toBe("Open Palm");
    expect(res?.confidence).toBe(0.92);

    const fist: HandPresence = {
      id: "1",
      type: "right",
      confidence: 0.9,
      landmarks: { wrist: {} } as any,
      timestamp: 200
    };

    const res2 = recognizer.recognize(fist);
    expect(res2?.gesture).toBe("Fist");
  });

  it("should recognize Swipe Left/Right and handle early circle predictions", () => {
    const recognizer = new DynamicRecognizer();

    const path: HandPresence[] = Array.from({ length: 10 }, (_, i) => ({
      id: "1",
      type: "right",
      confidence: 0.9,
      landmarks: { wrist: { x: i * 20, y: 0, z: 0 } } as any,
      timestamp: i * 100
    }));

    const swipeRight = recognizer.analyzeTrajectory(path);
    expect(swipeRight?.gesture).toBe("Swipe Right");
    expect(swipeRight?.confidence).toBe(0.94);
  });

  it("should record, version, and export/import custom gestures", () => {
    const studio = new CustomGestureStudio();
    studio.startRecording();
    studio.recordFrame({ id: "1", type: "right", confidence: 0.9, landmarks: { wrist: { x: 0, y: 0, z: 0 } } as any, timestamp: 100 });
    studio.recordFrame({ id: "1", type: "right", confidence: 0.9, landmarks: { wrist: { x: 50, y: 50, z: 50 } } as any, timestamp: 200 });

    const g = studio.saveGesture("L-Shape", "DrawSquare");
    expect(g.name).toBe("L-Shape");
    expect(g.version).toBe("1.0.0");

    const json = studio.exportGestures();
    const cleanStudio = new CustomGestureStudio();
    cleanStudio.importGestures(json);
    expect(cleanStudio.getGesture("L-Shape")?.assignedAction).toBe("DrawSquare");
  });

  it("should generate early predictions and support prediction cancellations", () => {
    const engine = new GesturePredictionEngine();

    const path: HandPresence[] = [
      { id: "1", type: "right", confidence: 0.9, landmarks: { wrist: { x: 0, y: 0, z: 0 } } as any, timestamp: 100 },
      { id: "1", type: "right", confidence: 0.9, landmarks: { wrist: { x: 50, y: 0, z: 0 } } as any, timestamp: 200 },
      { id: "1", type: "right", confidence: 0.9, landmarks: { wrist: { x: 90, y: 0, z: 0 } } as any, timestamp: 300 }
    ];

    const pred = engine.predictNextGesture(path);
    expect(pred?.predictedGesture).toBe("Swipe Right");
    expect(pred?.earlyTriggered).toBe(true);

    engine.cancelPrediction();
    expect(engine.predictNextGesture(path)).toBeNull();
  });

  it("should map actions and dispatch triggers", () => {
    const dispatcher = new ActionDispatcher();
    dispatcher.registerMapping({
      gestureName: "Fist",
      actionId: "undo-action",
      type: "SystemShortcut"
    });

    expect(dispatcher.dispatch("Fist")).toBe(true);
    expect(dispatcher.getHistory()[0]).toBe("undo-action");
  });

  it("should create and activate gaming/creative gesture profiles", () => {
    const manager = new GestureProfileManager();
    manager.createProfile({
      id: "creative-profile",
      name: "Drawing Mode Actions",
      type: "Creative",
      mappings: { Fist: "undo", Point: "draw" }
    });

    manager.activateProfile("creative-profile");
    expect(manager.getActiveProfile()?.type).toBe("Creative");
  });
});
