import { VoiceIntent, VoiceEntities } from "../types";

export class IntentEngine {
  /**
   * Evaluates a transcript string and resolves its command intent and entity parameters.
   */
  public parseCommand(rawText: string): { intent: VoiceIntent; entities: VoiceEntities } {
    const text = rawText.toLowerCase().trim();
    const entities: VoiceEntities = {};

    // 1. Drawing Intent
    // English: "draw a circle", "create a square"
    // Hindi: "गोला बनाओ", "त्रिभुज बनाओ"
    const shapeRegex = /(circle|square|triangle|rectangle|line|गोला|वर्ग|त्रिभुज|रेखा|आयत)/i;
    const isDrawing = /draw|create|make|बनाओ|चित्र/i.test(text) || shapeRegex.test(text);

    if (isDrawing) {
      const match = text.match(shapeRegex);
      if (match && match[1]) {
        entities.shapeName = this.normalizeShape(match[1]);
        return { intent: "drawing", entities };
      }
    }

    // 2. Brush Control Intent
    // English: "change brush to neon", "neon brush"
    // Hindi: "ब्रश बदलो", "नियोन ब्रश"
    const brushRegex = /(neon|laser|pen|pencil|marker|eraser|नियोन|लेजर|पेन|पेंसिल)/i;
    const isBrush = /brush|eraser|बदलो|बदलें/i.test(text);

    if (isBrush) {
      const match = text.match(brushRegex);
      if (match && match[1]) {
        entities.brushType = this.normalizeBrush(match[1]);
        return { intent: "brush_control", entities };
      }
    }

    // 3. Editing Intent (Undo, Redo, Delete)
    if (/undo|पूर्ववत|पीछे/i.test(text)) {
      return { intent: "editing", entities };
    }
    if (/redo|आगे|फिर से/i.test(text)) {
      return { intent: "editing", entities };
    }

    // 4. System / Settings Intent (exporting, grid)
    if (/export|save|save project/i.test(text)) {
      const formatMatch = text.match(/(svg|png|jpg|pdf)/i);
      if (formatMatch && formatMatch[1]) {
        entities.format = formatMatch[1].toLowerCase();
      }
      return { intent: "system", entities };
    }

    if (/grid|mode|background|ग्रिड/i.test(text)) {
      return { intent: "system", entities };
    }

    // 5. Navigation Intent
    if (/zoom|pan|scroll|ज़ूम/i.test(text)) {
      const numMatch = text.match(/(\d+)/);
      if (numMatch && numMatch[1]) {
        entities.dimensionValue = parseInt(numMatch[1], 10);
      }
      return { intent: "navigation", entities };
    }

    return { intent: "unknown", entities };
  }

  private normalizeShape(shape: string): string {
    const map: Record<string, string> = {
      circle: "circle",
      गोला: "circle",
      square: "square",
      वर्ग: "square",
      triangle: "triangle",
      त्रिभुज: "triangle",
      rectangle: "rectangle",
      आयत: "rectangle",
      line: "line",
      रेखा: "line"
    };
    return map[shape.toLowerCase()] || shape;
  }

  private normalizeBrush(brush: string): string {
    const map: Record<string, string> = {
      neon: "neon",
      नियोन: "neon",
      laser: "laser",
      लेजर: "laser",
      pen: "pen",
      पेन: "pen",
      pencil: "pencil",
      पेंसिल: "pencil"
    };
    return map[brush.toLowerCase()] || brush;
  }
}
export * from "../types";
