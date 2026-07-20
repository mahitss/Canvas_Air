import { SketchStroke, SketchSceneRepresentation, PromptParameters } from "./domain";
import { ImageGenerationOptions, GenerationResult } from "./types";

export interface ISketchInterpreter {
  interpret(
    strokes: SketchStroke[],
    shapes: any[],
    handwriting: string[],
    diagramMetadata?: Record<string, any>
  ): SketchSceneRepresentation;
}

export interface IPromptBuilder {
  buildPrompt(
    scene: SketchSceneRepresentation,
    instructions: string,
    style: string,
    params: PromptParameters
  ): { positive: string; negative: string };
}

export interface IImageGenerationManager {
  generate(
    scene: SketchSceneRepresentation,
    instructions: string,
    style: string,
    options: ImageGenerationOptions
  ): Promise<GenerationResult>;
}
