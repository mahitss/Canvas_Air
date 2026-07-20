import { ISketchInterpreter } from "../interfaces";
import { SketchStroke, SketchSceneRepresentation } from "../domain";
import { InterpreterException } from "../errors";

export class SketchInterpreter implements ISketchInterpreter {
  /**
   * Interprets multimodal inputs including raw strokes, classified shapes, and handwriting
   * to construct a structured scene representation.
   */
  public interpret(
    strokes: SketchStroke[],
    shapes: any[],
    handwriting: string[],
    diagramMetadata?: Record<string, any>
  ): SketchSceneRepresentation {
    if (!Array.isArray(strokes)) {
      throw new InterpreterException("Strokes array must be defined");
    }

    // 1. Calculate overall stroke density
    let totalPoints = 0;
    for (const stroke of strokes) {
      if (stroke.points) {
        totalPoints += stroke.points.length;
      }
    }
    const strokeDensityScore = strokes.length === 0 ? 0.0 : Number((totalPoints / strokes.length).toFixed(2));

    // 2. Map shapes to detected objects bounding boxes
    const detectedObjects = shapes.map((s) => {
      const type = s.type || "unknown";
      const box = s.geometry || { x: 0, y: 0, w: 100, h: 100 };
      return {
        type,
        box: {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          w: Math.max(0, box.w),
          h: Math.max(0, box.h)
        }
      };
    });

    // 3. Compile handwriting annotations
    const annotationsText = handwriting.filter((h) => typeof h === "string" && h.trim().length > 0);

    // 4. Resolve diagram summary from metadata
    let diagramSummary: string | undefined;
    if (diagramMetadata) {
      const type = diagramMetadata.diagramType || "generic";
      const count = diagramMetadata.nodesCount || 0;
      diagramSummary = `Diagram type: ${type} with ${count} blocks`;
    }

    return {
      detectedObjects,
      annotationsText,
      strokeDensityScore,
      canvasBounds: { width: 1920, height: 1080 },
      diagramSummary
    };
  }
}
