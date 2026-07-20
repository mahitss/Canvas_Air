import { ISceneDetectionProvider } from "../interfaces";
import { DetectedObject } from "../types";
import { DetectionProviderException } from "../errors";

export class DefaultSceneDetectionProvider implements ISceneDetectionProvider {
  public readonly id = "default-scene-provider";
  public readonly name = "Default Mock YOLO Local Engine";
  public readonly type = "local";
  private initialized = false;

  public async initialize(): Promise<void> {
    this.initialized = true;
  }

  public async detect(imageUri: string, options?: any): Promise<DetectedObject[]> {
    void options;
    if (!this.initialized) {
      throw new DetectionProviderException("YOLO detection engine has not been initialized");
    }

    if (!imageUri) {
      throw new DetectionProviderException("Image URI parameter cannot be empty");
    }

    return [
      {
        id: `obj-mock-${Date.now()}`,
        trackingId: "track-1",
        label: "person",
        confidence: 0.94,
        x: 100,
        y: 150,
        w: 200,
        h: 400
      }
    ];
  }

  public async health(): Promise<"healthy" | "degraded" | "down"> {
    return this.initialized ? "healthy" : "down";
  }

  public async dispose(): Promise<void> {
    this.initialized = false;
  }
}
export * from "../types";
