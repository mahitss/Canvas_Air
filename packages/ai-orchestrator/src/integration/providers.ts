import { AiModule, AiTask } from "../types";

/**
 * Adapter wrapping shape-recognition engine instance to IAiModule contract.
 */
export function wrapShapeRecognition(engine: any): AiModule {
  return {
    name: "ShapeRecognitionProvider",
    capabilities: ["shape_recognition"],
    version: "1.0.0",
    execute: async (task: AiTask) => {
      if (typeof engine.recognize === "function") {
        return engine.recognize(task.payload.points);
      }
      return { shape: "unknown", confidence: 0 };
    },
    healthCheck: async () => {
      return typeof engine.isHealthy === "function" ? engine.isHealthy() : true;
    }
  };
}

/**
 * Adapter wrapping handwriting recognition engine instance to IAiModule contract.
 */
export function wrapHandwriting(engine: any): AiModule {
  return {
    name: "HandwritingProvider",
    capabilities: ["handwriting"],
    version: "1.0.0",
    execute: async (task: AiTask) => {
      if (typeof engine.recognizeHandwriting === "function") {
        return engine.recognizeHandwriting(task.payload.strokes);
      }
      return { text: "" };
    },
    healthCheck: async () => {
      return typeof engine.isHealthy === "function" ? engine.isHealthy() : true;
    }
  };
}

/**
 * Adapter wrapping voice command engine instance to IAiModule contract.
 */
export function wrapVoiceCommand(engine: any): AiModule {
  return {
    name: "VoiceCommandProvider",
    capabilities: ["voice_command"],
    version: "1.0.0",
    execute: async (task: AiTask) => {
      if (typeof engine.processAudio === "function") {
        return engine.processAudio(task.payload.audioBuffer);
      }
      return { intent: "none" };
    },
    healthCheck: async () => {
      return typeof engine.isHealthy === "function" ? engine.isHealthy() : true;
    }
  };
}
