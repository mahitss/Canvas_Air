export type DocEventType =
  | "ParsingStarted"
  | "ParsingCompleted"
  | "LayoutAnalyzed"
  | "EntitiesIdentified"
  | "ParsingFailed";

export interface DocumentIntelligenceEvent {
  type: DocEventType;
  payload: any;
  timestamp: number;
}
