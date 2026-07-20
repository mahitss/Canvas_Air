import { DetectedObject } from "./types";
import { NormalizedInput, StructuredSceneModel } from "./domain";

export interface ISceneDetectionProvider {
  id: string;
  name: string;
  type: "local" | "cloud" | "llm";
  initialize(): Promise<void>;
  detect(imageUri: string, options?: any): Promise<DetectedObject[]>;
  health(): Promise<"healthy" | "degraded" | "down">;
  dispose(): Promise<void>;
}

export interface IInputParser {
  parseStaticImage(data: ArrayBuffer | string): NormalizedInput;
  parseCameraFrame(frameData: any): NormalizedInput;
  parseVideoStream(stream: any): AsyncGenerator<NormalizedInput>;
  parseBatch(inputs: (ArrayBuffer | string)[]): NormalizedInput[];
}

export interface IObjectDetector {
  detect(input: NormalizedInput): Promise<DetectedObject[]>;
}

export interface ISceneUnderstandingManager {
  processScene(input: NormalizedInput): Promise<StructuredSceneModel>;
}
