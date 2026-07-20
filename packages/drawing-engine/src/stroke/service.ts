import { IStrokeService, StrokeConfig } from "../interfaces";
import { DrawingPoint, DrawingStroke } from "../types";

/**
 * Service orchestrating point collections, density filtering, and stroke lifecycle bounds.
 */
export class StrokeService implements IStrokeService {
  private activeStroke: DrawingStroke | null = null;

  constructor(
    private readonly config: StrokeConfig = {
      minDistanceThreshold: 2.0, // pixels
      minTimeThresholdMs: 8.0    // milliseconds (~120Hz cap)
    }
  ) {}

  /**
   * Starts a new stroke.
   */
  public startStroke(
    strokeId: string,
    layerId: string,
    brushConfig: { name: string; color: string; width: number; opacity: number },
    initialPoint: DrawingPoint
  ): DrawingStroke {
    this.activeStroke = {
      id: strokeId,
      points: [{ ...initialPoint }],
      brushName: brushConfig.name,
      color: brushConfig.color,
      width: brushConfig.width,
      opacity: brushConfig.opacity,
      layerId,
      isLocked: false,
      isVisible: true
    };
    return this.cloneStroke(this.activeStroke);
  }

  /**
   * Appends a coordinate point, applying distance and time density filters.
   */
  public addPoint(point: DrawingPoint): DrawingStroke | null {
    if (!this.activeStroke) {
      return null;
    }

    const last = this.activeStroke.points[this.activeStroke.points.length - 1]!;

    // Configurable point density constraints checks
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dt = point.timestamp - last.timestamp;

    if (distance < this.config.minDistanceThreshold && dt < this.config.minTimeThresholdMs) {
      return null; // Skip point to maintain density caps
    }

    this.activeStroke.points.push({ ...point });
    return this.cloneStroke(this.activeStroke);
  }

  /**
   * Finalizes the current stroke.
   */
  public completeStroke(): DrawingStroke | null {
    if (!this.activeStroke) {
      return null;
    }
    const completed = this.activeStroke;
    this.activeStroke = null;
    return this.cloneStroke(completed);
  }

  /**
   * Interrupts/cancels the current stroke mid-way, discarding the current stroke state.
   */
  public cancelStroke(): void {
    this.activeStroke = null;
  }

  /**
   * Gets the active stroke state.
   */
  public getActiveStroke(): DrawingStroke | null {
    if (!this.activeStroke) {
      return null;
    }
    return this.cloneStroke(this.activeStroke);
  }

  private cloneStroke(stroke: DrawingStroke): DrawingStroke {
    return {
      ...stroke,
      points: stroke.points.map((p) => ({ ...p }))
    };
  }
}
