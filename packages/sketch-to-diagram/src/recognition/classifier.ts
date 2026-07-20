import { IDiagramClassifier } from "../interfaces";
import { SemanticRepresentation, ClassificationResult } from "../domain";
import { ClassifierException } from "../errors";

export interface IClassifierModelProvider {
  analyzeLabels(rep: SemanticRepresentation): Promise<{ type: string; confidence: number }[]>;
}

export class DefaultClassifierModelProvider implements IClassifierModelProvider {
  /**
   * Mock classifier model provider recognizing semantic characteristics.
   */
  public async analyzeLabels(rep: SemanticRepresentation): Promise<{ type: string; confidence: number }[]> {
    const labels: { type: string; confidence: number }[] = [];

    // Analyze labels text
    const textContents = rep.texts.map((t) => t.content.toLowerCase());
    const shapeTypes = rep.shapes.map((s) => s.shapeType);

    // UML heuristic
    if (textContents.some((c) => c.includes("class") || c.includes("interface"))) {
      labels.push({ type: "UML Class Diagram", confidence: 0.95 });
    }

    // Flowchart heuristic
    if (shapeTypes.includes("diamond") || textContents.some((c) => c.includes("start") || c.includes("decision"))) {
      labels.push({ type: "Flowchart", confidence: 0.88 });
    }

    // ERD heuristic
    if (textContents.some((c) => c.includes("pk") || c.includes("fk") || c.includes("one-to-many"))) {
      labels.push({ type: "ER Diagram", confidence: 0.92 });
    }

    // Mindmap heuristic
    if (rep.shapes.some((s) => s.shapeType === "circle") && rep.connectors.length > 5) {
      labels.push({ type: "Mind Map", confidence: 0.80 });
    }

    // Network Diagram heuristic
    if (textContents.some((c) => c.includes("ip") || c.includes("router") || c.includes("switch"))) {
      labels.push({ type: "Network Diagram", confidence: 0.90 });
    }

    // Org Chart heuristic
    if (textContents.some((c) => c.includes("ceo") || c.includes("manager") || c.includes("vp"))) {
      labels.push({ type: "Org Chart", confidence: 0.85 });
    }

    // Default fallback
    if (labels.length === 0) {
      labels.push({ type: "Flowchart", confidence: 0.60 });
    }

    return labels.sort((a, b) => b.confidence - a.confidence);
  }
}

export class DiagramClassifier implements IDiagramClassifier {
  constructor(private readonly provider: IClassifierModelProvider = new DefaultClassifierModelProvider()) {}

  /**
   * Classifies the semantic representation, returning primary type and multi-label confidences.
   */
  public async classify(rep: SemanticRepresentation): Promise<ClassificationResult> {
    const start = Date.now();
    try {
      const labels = await this.provider.analyzeLabels(rep);
      const primary = labels[0]!;

      return {
        primaryType: primary.type,
        confidenceScore: primary.confidence,
        labels,
        timeMs: Date.now() - start
      };
    } catch (err: any) {
      throw new ClassifierException(err.message);
    }
  }
}
