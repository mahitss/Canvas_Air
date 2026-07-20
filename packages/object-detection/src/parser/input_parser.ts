import { IInputParser } from "../interfaces";
import { NormalizedInput } from "../domain";
import { ParserException } from "../errors";

export class InputParser implements IInputParser {
  /**
   * Translates static images streams into normalized coordinate input buffers.
   */
  public parseStaticImage(data: ArrayBuffer | string): NormalizedInput {
    if (!data) {
      throw new ParserException("Static image buffer cannot be empty");
    }

    return {
      id: `img-${Date.now()}`,
      sourceType: "image",
      width: 1920,
      height: 1080,
      pixelData: data,
      timestamp: Date.now()
    };
  }

  /**
   * Translates camera frames coordinates into normalized inputs.
   */
  public parseCameraFrame(frameData: any): NormalizedInput {
    if (!frameData || !frameData.pixels) {
      throw new ParserException("Camera frame pixels data must be defined");
    }

    return {
      id: `frame-${Date.now()}`,
      sourceType: "frame",
      width: frameData.width ?? 640,
      height: frameData.height ?? 480,
      pixelData: frameData.pixels,
      timestamp: Date.now()
    };
  }

  /**
   * Yields video streams segments recursively as an async generator.
   */
  public async *parseVideoStream(stream: any): AsyncGenerator<NormalizedInput> {
    if (!stream) {
      throw new ParserException("Video stream must be defined");
    }

    // Mock stream yield loop
    for (let i = 0; i < 3; i++) {
      yield {
        id: `stream-frame-${i}-${Date.now()}`,
        sourceType: "stream",
        width: 1280,
        height: 720,
        pixelData: new ArrayBuffer(10),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Batches multiple images files streams.
   */
  public parseBatch(inputs: (ArrayBuffer | string)[]): NormalizedInput[] {
    if (!Array.isArray(inputs)) {
      throw new ParserException("Batch inputs must be an array list");
    }
    return inputs.map((data, idx) => ({
      id: `batch-${idx}-${Date.now()}`,
      sourceType: "batch",
      width: 1920,
      height: 1080,
      pixelData: data,
      timestamp: Date.now()
    }));
  }
}
export * from "../types";
