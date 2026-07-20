import { IVoiceCommandParser, StructuredCommand } from "../interfaces";
import { IntentRecognitionService } from "../intent/service";

/**
 * VoiceCommandParser converts raw recognized speech transcripts into structured validated commands,
 * managing syntax constraints, parameter normalization, ambiguity flags, and aliases mapping.
 */
export class VoiceCommandParser implements IVoiceCommandParser {
  private intentService: IntentRecognitionService;
  private aliases: Map<string, (string | RegExp)[]> = new Map();

  constructor(intentService?: IntentRecognitionService) {
    this.intentService = intentService || new IntentRecognitionService();
    this.registerDefaultAliases();
  }

  /**
   * Registers a dynamic alias mapping to a core intent.
   */
  public registerAlias(intent: string, aliasPattern: string | RegExp): void {
    const list = this.aliases.get(intent) || [];
    list.push(aliasPattern);
    this.aliases.set(intent, list);
  }

  /**
   * Parses the text transcript and context to yield a StructuredCommand.
   */
  public parse(text: string, context?: any): StructuredCommand {
    const cleanText = text.toLowerCase().trim();
    
    // 1. Resolve Aliases
    let resolvedText = cleanText;
    let resolvedIntentOverride: string | null = null;

    for (const [intentName, patternList] of this.aliases.entries()) {
      for (const pattern of patternList) {
        if (pattern instanceof RegExp) {
          if (pattern.test(cleanText)) {
            resolvedIntentOverride = intentName;
            break;
          }
        } else {
          if (cleanText === pattern || cleanText.includes(pattern)) {
            // Replace alias with base word/intent
            resolvedIntentOverride = intentName;
            break;
          }
        }
      }
      if (resolvedIntentOverride) break;
    }

    // 2. Perform base intent recognition
    const recognition = this.intentService.recognize(resolvedText, context);
    let finalIntent = resolvedIntentOverride || recognition.intent;
    const finalEntities = recognition.entities;
    
    let isValid = true;
    const errors: string[] = [];
    let isAmbiguous = false;
    const suggestions: string[] = [];

    // 3. Syntax validation rules
    if (finalIntent === "create") {
      if (!finalEntities.shapeName) {
        isValid = false;
        errors.push("Missing shapeName parameter. Specify a shape (e.g. circle, square).");
        suggestions.push("create circle", "create square", "draw a line");
      }
    } else if (finalIntent === "export") {
      if (!finalEntities.format) {
        // Soft validation fallback: default to png rather than failing, but flag it
        finalEntities.format = "png";
        suggestions.push("export as svg", "export as pdf");
      }
    } else if (finalIntent === "zoom") {
      const hasValue = finalEntities.dimensionValue !== undefined;
      const hasDirection = /in|out|up|down/i.test(cleanText);
      if (!hasValue && !hasDirection) {
        isValid = false;
        errors.push("Missing zoom target level or direction (e.g. in, out, 150%).");
        suggestions.push("zoom in", "zoom out", "zoom 100");
      }
    }

    // 4. Ambiguity rules
    // Rule A: General "clear" is ambiguous between delete active shape vs delete everything
    if (cleanText === "clear" || cleanText === "delete" || cleanText === "remove") {
      isAmbiguous = true;
      suggestions.push("delete active shape", "clear whole screen");
    }

    // Rule B: Multiple command keywords collision (e.g. "draw circle and delete screen")
    const createMatch = /draw|create|make/i.test(cleanText);
    const deleteMatch = /delete|clear|remove/i.test(cleanText);
    if (createMatch && deleteMatch) {
      isAmbiguous = true;
      suggestions.push("draw shape", "delete shape");
    }

    const result: StructuredCommand = {
      intent: finalIntent,
      entities: finalEntities,
      rawText: text,
      isValid
    };

    if (errors.length > 0) {
      result.errors = errors;
    }
    if (isAmbiguous) {
      result.isAmbiguous = true;
    }
    if (suggestions.length > 0) {
      result.suggestions = suggestions;
    }

    return result;
  }

  private registerDefaultAliases(): void {
    // Save aliases
    this.registerAlias("save", "persist");
    this.registerAlias("save", "keep");

    // Zoom aliases
    this.registerAlias("zoom", "enlarge");
    this.registerAlias("zoom", "magnify");
    
    // Delete aliases
    this.registerAlias("delete", "wipe");
    this.registerAlias("delete", "discard");
  }
}
