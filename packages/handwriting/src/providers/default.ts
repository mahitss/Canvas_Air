import { IHandwritingRecognitionProvider, ProviderHealth } from "./interfaces";
import { Stroke2D, RecognitionResult } from "../types";
import { HandwritingRecognitionEngine } from "../engine";

/**
 * Default offline handwriting recognition provider.
 * Wraps the local HandwritingRecognitionEngine.
 */
export class DefaultHandwritingRecognitionProvider implements IHandwritingRecognitionProvider {
  private engine: HandwritingRecognitionEngine | null = null;
  private isInitialized = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.engine = new HandwritingRecognitionEngine();
    this.isInitialized = true;
  }

  public async recognize(strokes: Stroke2D[]): Promise<RecognitionResult> {
    if (!this.isInitialized || !this.engine) {
      throw new Error("Handwriting recognition provider is not initialized.");
    }
    // Delegate to offline engine
    return this.engine.recognizeContinuous(strokes);
  }

  public async dispose(): Promise<void> {
    this.engine = null;
    this.isInitialized = false;
  }

  public async health(): Promise<ProviderHealth> {
    return {
      status: this.isInitialized ? "healthy" : "unhealthy",
      details: this.isInitialized ? "Offline engine active and loaded." : "Provider is not initialized.",
      lastChecked: Date.now()
    };
  }

  public version(): string {
    return "1.0.0";
  }
}
