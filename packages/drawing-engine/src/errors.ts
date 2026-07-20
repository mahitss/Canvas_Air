/**
 * Base custom error class for all Drawing Engine related operations.
 */
export class DrawingEngineError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "DrawingEngineError";
  }
}

/**
 * Error thrown when a requested layer identifier cannot be found in the layer registry.
 */
export class LayerNotFoundError extends DrawingEngineError {
  constructor(layerId: string) {
    super(`Layer with ID '${layerId}' was not found.`, "LAYER_NOT_FOUND");
  }
}

/**
 * Error thrown when an unrecognized brush name is specified.
 */
export class BrushNotFoundError extends DrawingEngineError {
  constructor(brushName: string) {
    super(`Brush '${brushName}' was not found.`, "BRUSH_NOT_FOUND");
  }
}

/**
 * Error thrown when a history command execution or undo/redo operation fails.
 */
export class HistoryCommandError extends DrawingEngineError {
  constructor(message: string) {
    super(message, "HISTORY_COMMAND_ERROR");
  }
}
