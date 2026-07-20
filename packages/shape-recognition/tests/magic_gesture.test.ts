import { describe, it, expect } from "vitest";
import { MagicRecognizer } from "../src/magic/magic_recognizer";
import { IntentPredictor } from "../src/magic/intent_predictor";
import { ContextAwarenessEngine } from "../src/magic/context_engine";
import { GestureComboEngine } from "../src/magic/combo_recognizer";
import { TwoHandIntelligence } from "../src/magic/two_hand_intelligence";
import { ContinuousMotionEngine } from "../src/magic/continuous_motion";
import { GestureMemoryEngine, AdaptiveAIConfigurator } from "../src/magic/gesture_memory";
import { CreativeMotionEngine, AISuggestionsManager, MagicLearningEngine } from "../src/magic/creative_actions";
import { Point2D } from "../src/types";

describe("Magic Spells & Shape Intelligent Recognizers", () => {
  it("should classify lightning zig-zag paths and closed heart shapes", () => {
    const recognizer = new MagicRecognizer();

    const circlePath: Point2D[] = [
      { x: 100, y: 100 },
      { x: 150, y: 50 },
      { x: 200, y: 100 },
      { x: 150, y: 150 },
      { x: 101, y: 101 }
    ];

    const result = recognizer.recognizePath(circlePath);
    expect(result?.shape).toBe("Circle");
    expect(result?.confidence).toBe(0.95);

    const zigZagPath: Point2D[] = Array.from({ length: 8 }, (_, i) => ({
      x: i * 20,
      y: (i % 2 === 0 ? 0 : 50)
    }));

    const result2 = recognizer.recognizePath(zigZagPath);
    expect(result2?.shape).toBe("Lightning");
  });

  it("should predict intent during early 30% drawing phase", () => {
    const predictor = new IntentPredictor();
    const partial: Point2D[] = [
      { x: 10, y: 10 },
      { x: 20, y: 12 },
      { x: 30, y: 15 }
    ];

    const pred = predictor.predictIntent(partial, 10); // 3 of 10 = 30%
    expect(pred?.predictedShape).toBe("Circle");
    expect(pred?.confidence).toBe(0.82);
  });

  it("should mutate action outcomes contextually based on brush profile", () => {
    const context = new ContextAwarenessEngine();
    expect(context.resolveContextualAction("Circle", "Fire Brush")).toBe("Portal of fire");
    expect(context.resolveContextualAction("Circle", "Galaxy Brush")).toBe("Galaxy vortex");
  });

  it("should evaluate combo shortcuts and buffers", () => {
    const combo = new GestureComboEngine();
    expect(combo.addGesture("Point")).toBeNull();
    expect(combo.addGesture("Swipe")).toBeNull();
    expect(combo.addGesture("Pinch")).toBe("Point-Swipe-Pinch Combo");
  });

  it("should compute two-hand offsets scaling factors", () => {
    const dual = new TwoHandIntelligence();
    const res = dual.evaluateTwoHandAction(
      { wrist: { x: 100, y: 100 }, gesture: "None" },
      { wrist: { x: 300, y: 100 }, gesture: "None" },
      100 // last distance
    );

    expect(res?.action).toBe("Scale World");
    expect(res?.value).toBe(2.0); // 200 / 100 = 2.0
  });

  it("should record continuous shapes transitions", () => {
    const continuous = new ContinuousMotionEngine();
    continuous.registerShapeInSequence("Circle");
    const seq = continuous.registerShapeInSequence("Triangle");

    expect(seq).toContain("Circle");
    expect(seq).toContain("Triangle");
  });

  it("should suggest favorite actions on repeated gestures and scale adaptive parameters", () => {
    const memory = new GestureMemoryEngine();
    expect(memory.recordGesture("Circle")).toBeNull();
    expect(memory.recordGesture("Circle")).toBeNull();
    expect(memory.recordGesture("Circle")).toBe("Favorite Action for Circle");

    const adaptive = new AdaptiveAIConfigurator();
    const config = adaptive.evaluateStyle(300, 20); // high speed, high jitter
    expect(config.sensitivity).toBe(1.5);
    expect(config.stabilization).toBe(true);
  });

  it("should resolve creative actions, dragon suggestion templates and learn spells", () => {
    const creative = new CreativeMotionEngine();
    expect(creative.getVisualEffectForShape("Lightning")).toBe("Lightning animation");

    const suggestions = new AISuggestionsManager();
    const points: Point2D[] = Array.from({ length: 6 }, () => ({ x: 0, y: 0 }));
    expect(suggestions.evaluatePartialDrawing(points, "dragon")).toBe("Finish dragon?");

    const learning = new MagicLearningEngine();
    learning.learnSpell("FireBall", [{ x: 0, y: 0 }]);
    expect(learning.getSpell("FireBall")?.length).toBe(1);
  });
});
