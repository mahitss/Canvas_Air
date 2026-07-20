import { IPromptBuilder } from "../interfaces";
import { SketchSceneRepresentation, PromptParameters } from "../domain";
import { ImageGenerationOptions, PromptInputs } from "../types";
import { PromptBuilderException } from "../errors";

export class PromptBuilder implements IPromptBuilder {
  /**
   * Overloaded buildPrompt signature supporting existing pipeline calls (2 arguments)
   * and clean architecture manager calls (4 arguments).
   */
  public buildPrompt(
    inputs: PromptInputs,
    options: ImageGenerationOptions
  ): string;
  public buildPrompt(
    scene: SketchSceneRepresentation,
    instructions: string,
    style: string,
    params: PromptParameters
  ): { positive: string; negative: string };
  public buildPrompt(
    first: any,
    second: any,
    third?: any,
    fourth?: any
  ): any {
    // Check if called with 2 arguments (backward compatibility signature)
    if (third === undefined) {
      const inputs = first as PromptInputs;
      const options = second as ImageGenerationOptions;
      const styleKeyword = inputs.stylePreference || options.style;
      const parts: string[] = [`A high-quality professional ${styleKeyword}`];
      if (inputs.shapes && inputs.shapes.length > 0) {
        parts.push(`depicting a composition of: ${inputs.shapes.join(", ")}`);
      }
      if (inputs.annotations && inputs.annotations.length > 0) {
        parts.push(`with details: ${inputs.annotations.join(". ")}`);
      }
      parts.push("masterpiece, detailed vector styling, smooth color layout, high resolution, award winning");
      return parts.join(", ");
    }

    // Otherwise, 4 arguments (clean architecture scene-based signature)
    const scene = first as SketchSceneRepresentation;
    const instructions = second as string;
    const style = third as string;
    const params = fourth as PromptParameters;

    const positiveParts: string[] = [];
    const base = params.positiveTemplate.replace("{style}", style);
    positiveParts.push(base);

    if (scene.detectedObjects && scene.detectedObjects.length > 0) {
      const objTypes = scene.detectedObjects.map((o) => o.type);
      positiveParts.push(`featuring recognized objects: ${objTypes.join(", ")}`);
    }

    if (scene.annotationsText && scene.annotationsText.length > 0) {
      positiveParts.push(`with textual elements: ${scene.annotationsText.join(", ")}`);
    }

    if (scene.diagramSummary) {
      positiveParts.push(`structured as a ${scene.diagramSummary}`);
    }

    if (instructions && instructions.trim().length > 0) {
      positiveParts.push(`following instruction: ${instructions}`);
    }

    if (params.modifiers && params.modifiers.length > 0) {
      positiveParts.push(params.modifiers.join(", "));
    }

    return {
      positive: positiveParts.join(", "),
      negative: params.negativeTemplate || "blurry, low resolution, worst quality, deformed"
    };
  }

  /**
   * Validates creativity score and guidance strength parameter bounds.
   */
  public validateParameters(options: ImageGenerationOptions): void {
    if (options.creativity < 0 || options.creativity > 1) {
      throw new PromptBuilderException("Creativity score must be between 0 and 1");
    }

    if (options.guidanceStrength < 1 || options.guidanceStrength > 20) {
      throw new PromptBuilderException("Guidance strength must be between 1 and 20");
    }
  }
}
export * from "../types";
