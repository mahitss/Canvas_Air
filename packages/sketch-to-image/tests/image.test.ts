import { describe, it, expect, beforeEach } from "vitest";
import { SketchToImagePipeline } from "../src/pipeline";
import { MockImageProviderAdapter } from "../src/adapters/provider";
import { PromptInputs, ImageGenerationOptions } from "../src/types";

describe("AI Sketch-to-Image Generation Pipeline", () => {
  let pipeline: SketchToImagePipeline;
  let adapter: MockImageProviderAdapter;

  const defaultOptions: ImageGenerationOptions = {
    style: "Concept Art",
    aspectRatio: "16:9",
    resolution: "1920x1080",
    creativity: 0.7,
    guidanceStrength: 8.5,
    seed: 54321
  };

  beforeEach(() => {
    pipeline = new SketchToImagePipeline();
    adapter = new MockImageProviderAdapter();
    pipeline.registerAdapter(adapter);
  });

  it("should synthesize structured prompt strings out of shapes and annotations", () => {
    const builder = pipeline.getPromptBuilder();
    const inputs: PromptInputs = {
      shapes: ["circle box", "arrow line"],
      annotations: ["flowchart diagram flow", "decision node step"]
    };

    const prompt = builder.buildPrompt(inputs, defaultOptions);
    expect(prompt).toContain("circle box, arrow line");
    expect(prompt).toContain("flowchart diagram flow. decision node step");
    expect(prompt).toContain("Concept Art");
  });

  it("should generate images and record execution profiles inside result history", async () => {
    const inputs: PromptInputs = {
      shapes: ["house rectangle", "triangle roof"],
      annotations: ["a cozy cottage in the woods"]
    };

    const result = await pipeline.generateImage(inputs, defaultOptions);
    expect(result.imageUrl).toBe("https://visioncanvas.ai/generated/mock-54321.png");
    expect(result.seed).toBe(54321);
    expect(result.timeMs).toBeGreaterThanOrEqual(0);

    const history = pipeline.getHistoryManager().getHistoryList();
    expect(history.length).toBe(1);
    expect(history[0].prompt).toContain("house rectangle");
    expect(history[0].result.imageUrl).toBe("https://visioncanvas.ai/generated/mock-54321.png");
  });

  it("should capture adapter execution failures safely and throw pipeline exceptions", async () => {
    const inputs: PromptInputs = {
      shapes: ["crash model simulation"],
      annotations: []
    };

    await expect(
      pipeline.generateImage(inputs, defaultOptions)
    ).rejects.toThrow(/Generative Model Adapter inference crash/);
  });
});
