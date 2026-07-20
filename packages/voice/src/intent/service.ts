import { VoiceEntities } from "../types";

export interface RecognitionContext {
  activeTool?: string;
  selectedElementId?: string;
  screenMode?: string;
  boostedIntents?: Record<string, number>;
}

export interface IntentDefinition {
  name: string;
  patterns: (string | RegExp)[];
  extractor?: (text: string) => VoiceEntities;
  contextWeight?: (context: RecognitionContext) => number;
}

export interface IntentRecognitionResult {
  intent: string;
  confidence: number;
  entities: VoiceEntities;
  rawText: string;
}

/**
 * Extensible, context-aware Intent Recognition Service supporting custom intent registrations,
 * dynamic scoring with pattern matching, entity extractors, and active tool context boosts.
 */
export class IntentRecognitionService {
  private registry: Map<string, IntentDefinition> = new Map();

  constructor() {
    this.registerDefaultIntents();
  }

  /**
   * Registers a new intent definition dynamically.
   */
  public registerIntent(def: IntentDefinition): void {
    this.registry.set(def.name, def);
  }

  /**
   * Unregisters an intent by name.
   */
  public deregisterIntent(name: string): void {
    this.registry.delete(name);
  }

  /**
   * Parses the raw transcript, finds the best matching registered intent, and computes context-aware confidence.
   */
  public recognize(text: string, context: RecognitionContext = {}): IntentRecognitionResult {
    const cleanText = text.toLowerCase().trim();
    let bestIntent: string = "unknown";
    let maxBaseConfidence = 0.0;
    let extractedEntities: VoiceEntities = {};

    for (const [name, def] of this.registry.entries()) {
      let baseConfidence = 0.0;

      for (const pattern of def.patterns) {
        if (pattern instanceof RegExp) {
          const match = cleanText.match(pattern);
          if (match) {
            // Regex match weight
            const coverage = match[0].length / cleanText.length;
            baseConfidence = Math.max(baseConfidence, 0.70 + coverage * 0.25);
          }
        } else {
          const normalizedPattern = pattern.toLowerCase().trim();
          if (cleanText === normalizedPattern) {
            baseConfidence = Math.max(baseConfidence, 1.0);
          } else if (cleanText.includes(normalizedPattern)) {
            const coverage = normalizedPattern.length / cleanText.length;
            baseConfidence = Math.max(baseConfidence, 0.50 + coverage * 0.35);
          }
        }
      }

      if (baseConfidence > maxBaseConfidence) {
        maxBaseConfidence = baseConfidence;
        bestIntent = name;
        if (def.extractor) {
          extractedEntities = def.extractor(cleanText);
        }
      }
    }

    if (bestIntent === "unknown" || maxBaseConfidence === 0.0) {
      return {
        intent: "unknown",
        confidence: 0.0,
        entities: {},
        rawText: text
      };
    }

    // Apply context aware boosts
    let finalConfidence = maxBaseConfidence;
    const matchedDef = this.registry.get(bestIntent);

    if (matchedDef) {
      // 1. Def level custom context booster function
      if (matchedDef.contextWeight) {
        finalConfidence += matchedDef.contextWeight(context);
      }

      // 2. Map-based manual boosted intents
      if (context.boostedIntents && context.boostedIntents[bestIntent] !== undefined) {
        const boost = context.boostedIntents[bestIntent];
        if (boost !== undefined) {
          finalConfidence += boost;
        }
      }
    }

    // Cap final confidence between 0.0 and 1.0
    finalConfidence = Math.max(0.0, Math.min(1.0, finalConfidence));

    return {
      intent: bestIntent,
      confidence: parseFloat(finalConfidence.toFixed(4)),
      entities: extractedEntities,
      rawText: text
    };
  }

  /**
   * Pre-populates the registry with standard intents.
   */
  private registerDefaultIntents(): void {
    // 1. Create intent
    this.registerIntent({
      name: "create",
      patterns: [
        "create",
        "make",
        "draw",
        "new",
        "बनाओ",
        "बनाएं",
        /(draw|create|make)\s+(a\s+)?(circle|square|triangle|rectangle|line)/i
      ],
      extractor: (txt) => {
        const shapeRegex = /(circle|square|triangle|rectangle|line|गोला|वर्ग|त्रिभुज|रेखा|आयत)/i;
        const match = txt.match(shapeRegex);
        if (match && match[1]) {
          return { shapeName: this.normalizeShape(match[1]) };
        }
        return {};
      },
      contextWeight: (ctx) => (ctx.activeTool === "shape" ? 0.15 : 0)
    });

    // 2. Delete intent
    this.registerIntent({
      name: "delete",
      patterns: ["delete", "remove", "erase", "clear", "हटाओ", "मिटाओ"],
      contextWeight: (ctx) => (ctx.activeTool === "eraser" ? 0.15 : 0)
    });

    // 3. Undo intent
    this.registerIntent({
      name: "undo",
      patterns: ["undo", "go back", "पूर्ववत", "पीछे"]
    });

    // 4. Redo intent
    this.registerIntent({
      name: "redo",
      patterns: ["redo", "go forward", "आगे", "फिर से"]
    });

    // 5. Zoom intent
    this.registerIntent({
      name: "zoom",
      patterns: ["zoom", "zoom in", "zoom out", "ज़ूम", /zoom\s+(in|out|\d+)/i],
      extractor: (txt) => {
        const match = txt.match(/(\d+)/);
        if (match && match[1]) {
          return { dimensionValue: parseInt(match[1], 10) };
        }
        return {};
      }
    });

    // 6. Search intent
    this.registerIntent({
      name: "search",
      patterns: ["search", "find", "look for", "खोजें"],
      contextWeight: (ctx) => (ctx.activeTool === "searchbar" ? 0.20 : 0)
    });

    // 7. Export intent
    this.registerIntent({
      name: "export",
      patterns: ["export", "export as", "निर्यात", /export\s+as\s+(svg|png|jpg|pdf)/i],
      extractor: (txt) => {
        const formatMatch = txt.match(/(svg|png|jpg|pdf)/i);
        if (formatMatch && formatMatch[1]) {
          return { format: formatMatch[1].toLowerCase() };
        }
        return {};
      }
    });

    // 8. Save intent
    this.registerIntent({
      name: "save",
      patterns: ["save", "save project", "सुरक्षित करें"]
    });
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
}
