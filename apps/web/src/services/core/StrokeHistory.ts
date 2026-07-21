// VisionCanvas AR | Core Stroke History Manager (Undo / Redo Stack)

import { Stroke } from "../DrawingPipeline";

export class StrokeHistory {
  public strokes: Stroke[] = [];
  public redoStack: Stroke[] = [];

  push(stroke: Stroke) {
    this.strokes.push(stroke);
    this.redoStack = []; // Clear redo stack on new action
  }

  undo(): Stroke | null {
    if (this.strokes.length > 0) {
      const popped = this.strokes.pop()!;
      this.redoStack.push(popped);
      return popped;
    }
    return null;
  }

  redo(): Stroke | null {
    if (this.redoStack.length > 0) {
      const popped = this.redoStack.pop()!;
      this.strokes.push(popped);
      return popped;
    }
    return null;
  }

  clear() {
    this.strokes = [];
    this.redoStack = [];
  }

  get canUndo(): boolean {
    return this.strokes.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
