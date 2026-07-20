export interface SceneClassificationResult {
  sceneType: "Indoor" | "Outdoor" | "Office" | "Classroom" | "Whiteboard" | "Desk" | "Meeting room" | "Custom";
  confidence: number;
}

export class SceneClassifier {
  private readonly customScenes = new Set<string>();

  public registerCustomScene(type: string): void {
    this.customScenes.add(type.toLowerCase());
  }

  /**
   * Matches labels arrays to deduce scene contexts (e.g. whiteboard, classroom).
   */
  public classifyScene(labels: string[]): SceneClassificationResult {
    const list = labels.map(l => l.toLowerCase());

    if (list.includes("marker") || list.includes("eraser") || list.includes("whiteboard")) {
      return { sceneType: "Whiteboard", confidence: 0.94 };
    }

    if (list.includes("desk") || list.includes("computer") || list.includes("keyboard")) {
      return { sceneType: "Desk", confidence: 0.91 };
    }

    if (list.includes("projector") || list.includes("podium") || list.includes("student")) {
      return { sceneType: "Classroom", confidence: 0.89 };
    }

    if (list.includes("office") || list.includes("chair")) {
      return { sceneType: "Office", confidence: 0.85 };
    }

    return { sceneType: "Indoor", confidence: 0.70 };
  }
}
