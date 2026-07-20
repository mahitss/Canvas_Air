import { ISketchParser } from "../interfaces";
import { SketchRawInput, SemanticRepresentation, SemanticShape, SemanticConnector } from "../domain";
import { ParserException } from "../errors";

export class SketchParser implements ISketchParser {
  /**
   * Translates raw sketch strokes and shapes into normalized coordinates and resolves text associations.
   */
  public parse(input: SketchRawInput): SemanticRepresentation {
    if (!input || !Array.isArray(input.elements)) {
      throw new ParserException("Raw input or elements array is undefined");
    }

    const shapes: SemanticShape[] = [];
    const connectors: SemanticConnector[] = [];
    const texts: { id: string; content: string; x: number; y: number }[] = [];
    const containments: { parentId: string; childId: string }[] = [];

    // Separate raw elements
    for (const elem of input.elements) {
      if (!elem.id || !elem.type || !elem.geometry) {
        continue; // skip malformed elements
      }

      const { x, y, w, h } = elem.geometry;

      if (elem.type === "shape") {
        const shapeType = elem.properties?.shapeType || "rectangle";
        shapes.push({
          id: elem.id,
          shapeType,
          x,
          y,
          w,
          h
        });
      } else if (elem.type === "text") {
        texts.push({
          id: elem.id,
          content: elem.properties?.text || "",
          x,
          y
        });
      } else if (elem.type === "arrow" || elem.type === "line" || elem.type === "connector") {
        const points = elem.geometry.points || [];
        const startX = points[0]?.x ?? x;
        const startY = points[0]?.y ?? y;
        const endX = points[points.length - 1]?.x ?? (x + w);
        const endY = points[points.length - 1]?.y ?? (y + h);

        connectors.push({
          id: elem.id,
          type: elem.type === "arrow" ? "arrow" : "line",
          startX,
          startY,
          endX,
          endY
        });
      }
    }

    // 1. Resolve Text Associations: associate text elements inside shapes' bounding boxes
    // Sort shapes by area ascending to match innermost container first
    const sortedShapes = [...shapes].sort((a, b) => (a.w * a.h) - (b.w * b.h));

    for (const text of texts) {
      for (const shape of sortedShapes) {
        if (
          text.x >= shape.x &&
          text.x <= shape.x + shape.w &&
          text.y >= shape.y &&
          text.y <= shape.y + shape.h
        ) {
          const original = shapes.find((s) => s.id === shape.id);
          if (original) {
            original.associatedText = text.content;
          }
          break; // associate to the smallest containing shape
        }
      }
    }

    // 2. Resolve Containment: check if one shape is inside another shape
    for (const parent of shapes) {
      for (const child of shapes) {
        if (parent.id === child.id) continue;
        if (
          child.x > parent.x &&
          child.x + child.w < parent.x + parent.w &&
          child.y > parent.y &&
          child.y + child.h < parent.y + parent.h
        ) {
          containments.push({ parentId: parent.id, childId: child.id });
        }
      }
    }

    return {
      shapes,
      connectors,
      texts,
      containments
    };
  }
}
