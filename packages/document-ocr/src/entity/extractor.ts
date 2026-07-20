import { DocumentEntity } from "../types";

export interface EntityPattern {
  type: string;
  regex: RegExp;
  confidence: number;
}

export class EntityExtractor {
  private patterns: Map<string, EntityPattern> = new Map();

  constructor() {
    this.registerPattern({
      type: "email",
      regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      confidence: 0.99
    });
    this.registerPattern({
      type: "date",
      regex: /\b\d{4}[-/.]\d{2}[-/.]\d{2}\b/g,
      confidence: 0.95
    });
    this.registerPattern({
      type: "amount",
      regex: /(?:\$|£|€|₹)\s?\d+(?:[.,]\d{2})?/g,
      confidence: 0.92
    });
    this.registerPattern({
      type: "phone",
      regex: /\+?\d{1,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
      confidence: 0.88
    });
    this.registerPattern({
      type: "id",
      regex: /\b[A-Z0-9]{8,12}\b/g,
      confidence: 0.85
    });
    this.registerPattern({
      type: "address",
      regex: /\b\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd)\b/g,
      confidence: 0.80
    });
  }

  public registerPattern(pattern: EntityPattern): void {
    this.patterns.set(pattern.type, pattern);
  }

  /**
   * Scans unstructured text for matching registry patterns and flags confidence ratings.
   */
  public extractEntities(text: string): DocumentEntity[] {
    const entities: DocumentEntity[] = [];

    for (const pattern of this.patterns.values()) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        entities.push({
          type: pattern.type,
          value: match[0],
          textSpan: match[0],
          confidence: pattern.confidence
        });
      }
    }

    return entities;
  }
}
