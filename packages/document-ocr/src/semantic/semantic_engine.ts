export interface SemanticGraphNode {
  id: string;
  label: string;
  type: string;
}

export interface SemanticGraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface SemanticAnalysisResult {
  summary: string;
  topics: string[];
  relationships: { fromSectionId: string; toSectionId: string; type: string }[];
  graph: {
    nodes: SemanticGraphNode[];
    edges: SemanticGraphEdge[];
  };
  knowledgeModel: Record<string, string>;
}

export class SemanticDocumentEngine {
  /**
   * Performs semantic graph matching, summary synthesis and entity mapping summaries.
   */
  public analyzeSemantics(text: string, sectionIds: string[]): SemanticAnalysisResult {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    // 1. Topic classification rules
    if (lowerText.includes("financial") || lowerText.includes("revenue") || lowerText.includes("invoice")) {
      topics.push("Finance");
    }
    if (lowerText.includes("system") || lowerText.includes("database") || lowerText.includes("architecture")) {
      topics.push("Engineering");
    }
    if (lowerText.includes("contract") || lowerText.includes("terms") || lowerText.includes("agree")) {
      topics.push("Legal");
    }
    if (topics.length === 0) {
      topics.push("General");
    }

    // 2. Summary synthesis
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
    const summary = sentences.slice(0, 2).join(". ") + ".";

    // 3. Section relationships
    const relationships: { fromSectionId: string; toSectionId: string; type: string }[] = [];
    if (sectionIds.length >= 2) {
      relationships.push({
        fromSectionId: sectionIds[0]!,
        toSectionId: sectionIds[1]!,
        type: "elaborates"
      });
    }

    // 4. Semantic graph nodes & edges
    const nodes: SemanticGraphNode[] = [];
    const edges: SemanticGraphEdge[] = [];

    // Heuristics: extract potential nodes from topics
    topics.forEach((t, idx) => {
      nodes.push({
        id: `node-${idx}`,
        label: t,
        type: "topic"
      });
    });

    if (nodes.length >= 2) {
      edges.push({
        source: nodes[0]!.id,
        target: nodes[1]!.id,
        relation: "associated"
      });
    }

    // 5. Knowledge model
    const knowledgeModel: Record<string, string> = {};
    if (lowerText.includes("author")) {
      knowledgeModel["author"] = "VisionCanvas Doc-Intel";
    }

    return {
      summary,
      topics,
      relationships,
      graph: { nodes, edges },
      knowledgeModel
    };
  }
}
