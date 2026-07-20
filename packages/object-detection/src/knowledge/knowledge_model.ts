import { DetectedObject } from "../types";

export interface KnowledgeModelVersion {
  version: string;
  schemaId: string;
  objectsCount: number;
  relationshipsCount: number;
}

export class SceneKnowledgeModel {
  public readonly version = "1.0.0";
  private attributesMap = new Map<string, Record<string, any>>();
  private temporalHistory: { timestamp: number; activeIds: string[] }[] = [];

  public getVersionDetails(): KnowledgeModelVersion {
    return {
      version: this.version,
      schemaId: `scene-schema-${this.version}`,
      objectsCount: this.attributesMap.size,
      relationshipsCount: 0
    };
  }

  public setAttributes(objectId: string, attributes: Record<string, any>): void {
    this.attributesMap.set(objectId, { ...attributes });
  }

  public getAttributes(objectId: string): Record<string, any> | null {
    return this.attributesMap.get(objectId) || null;
  }

  public logFrameHistory(objects: DetectedObject[]): void {
    this.temporalHistory.push({
      timestamp: Date.now(),
      activeIds: objects.map(o => o.id)
    });

    if (this.temporalHistory.length > 50) {
      this.temporalHistory.shift();
    }
  }

  public getFrameHistory() {
    return this.temporalHistory;
  }
}
export * from "../types";
