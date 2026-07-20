import { Point2D, ShapePrediction } from "../types";

export interface ProviderMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
}

export interface ProviderHealth {
  status: "healthy" | "unhealthy" | "degraded";
  details?: string;
  lastChecked: number;
}

export interface IShapeRecognitionProvider {
  readonly metadata: ProviderMetadata;
  classify(points: Point2D[]): ShapePrediction;
  getHealth(): ProviderHealth;
}
