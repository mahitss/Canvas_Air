import { FrameData } from "@visioncanvas/camera-vision";
import { IHandDetector } from "./interfaces";
import { HandPresence } from "./types";

/**
 * Stub implementation of Hand Detector.
 */
export class HandDetector implements IHandDetector {
  public async detect(_frame: FrameData): Promise<HandPresence[]> {
    // No implementation logic as requested
    return [];
  }
}


