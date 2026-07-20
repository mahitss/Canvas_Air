import { describe, it, expect } from "vitest";
import { SketchInterpreter } from "../src/interpreter/sketch_interpreter";
import { PromptBuilder } from "../src/prompt/builder";
import { SketchStroke, PromptParameters } from "../src/domain";

describe("AI Sketch-to-Image Engine Components", () => {
  it("should interpret strokes density, shape boundaries, and handwriting annotations", () => {
    const interpreter = new SketchInterpreter();

    const strokes: SketchStroke[] = [
      { id: "s1", points: [{ x: 0, y: 0 }, { x: 5, y: 5 }], brushWidth: 2, color: "#000" }
    ];

    const shapes = [
      { type: "circle", geometry: { x: 10, y: -20, w: 40, h: 40 } } // negative y normalized
    ];

    const handwriting = ["house", "tree"];
    const metadata = { diagramType: "flowchart", nodesCount: 4 };

    const scene = interpreter.interpret(strokes, shapes, handwriting, metadata);
    expect(scene.strokeDensityScore).toBe(2);
    expect(scene.detectedObjects[0]?.type).toBe("circle");
    expect(scene.detectedObjects[0]?.box.y).toBe(0); // normalized to 0
    expect(scene.annotationsText).toEqual(["house", "tree"]);
    expect(scene.diagramSummary).toContain("flowchart");
  });

  it("should compile positive and negative templates and throw on invalid params bounds", () => {
    const builder = new PromptBuilder();

    const scene = {
      detectedObjects: [{ type: "sun", box: { x: 0, y: 0, w: 10, h: 10 } }],
      annotationsText: ["shiny"],
      strokeDensityScore: 1,
      canvasBounds: { width: 100, height: 100 },
      diagramSummary: undefined
    };

    const params: PromptParameters = {
      positiveTemplate: "A beautiful {style} drawing",
      negativeTemplate: "low quality",
      modifiers: ["masterpiece", "trending"]
    };

    const result = builder.buildPrompt(scene, "add clouds", "Watercolor", params);
    expect(result.positive).toContain("A beautiful Watercolor drawing");
    expect(result.positive).toContain("recognized objects: sun");
    expect(result.positive).toContain("add clouds");
    expect(result.negative).toBe("low quality");

    // Validation checks
    expect(() =>
      builder.validateParameters({ creativity: 1.5, guidanceStrength: 5, style: "", aspectRatio: "", resolution: "" })
    ).toThrow(/Creativity/);

    expect(() =>
      builder.validateParameters({ creativity: 0.5, guidanceStrength: 25, style: "", aspectRatio: "", resolution: "" })
    ).toThrow(/Guidance/);
  });

  it("should support overloaded signatures for backward compatibility", () => {
    const builder = new PromptBuilder();

    const inputs = {
      shapes: ["circle", "box"],
      annotations: ["main flow"],
      stylePreference: "Oil Painting"
    };

    const options = {
      style: "Illustration",
      aspectRatio: "1:1",
      resolution: "512x512",
      creativity: 0.5,
      guidanceStrength: 7
    };

    // 2-argument signature
    const prompt = builder.buildPrompt(inputs, options);
    expect(typeof prompt).toBe("string");
    expect(prompt).toContain("Oil Painting");
    expect(prompt).toContain("circle, box");
  });
});
