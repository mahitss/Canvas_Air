import { IShapeNormalizationService } from "../interfaces";
import { Point2D, ShapePrediction, NormalizedShape } from "../types";
import { SnappingEngine } from "../snapping/snap";
import { DEFAULT_SHAPE_CONFIG } from "../config";

/**
 * Service that normalizes freehand shapes to ideal coordinates, sizes, and angles.
 */
export class ShapeNormalizationService implements IShapeNormalizationService {
  private snappingEngine: SnappingEngine;
  private gridSize: number;

  constructor(
    gridSize = DEFAULT_SHAPE_CONFIG.snapping.gridSize,
    snapDistance = DEFAULT_SHAPE_CONFIG.snapping.snapDistance,
    angleSnapStepDeg = DEFAULT_SHAPE_CONFIG.snapping.angleSnapStepDeg
  ) {
    this.gridSize = gridSize;
    this.snappingEngine = new SnappingEngine({
      gridSize,
      snapDistance,
      angleSnapStepDeg
    });
  }

  /**
   * Normalizes prediction coordinates into ideal geometries using configurable snapping strength.
   */
  public normalize(prediction: ShapePrediction, strength = 1.0): NormalizedShape {
    const { shapeType, confidence, boundingBox, corners } = prediction;
    
    // Clamp strength coefficient [0.0, 1.0]
    const k = Math.max(0.0, Math.min(1.0, strength));

    const result: NormalizedShape = {
      shapeType,
      confidence,
      metadata: {
        originalBoundingBox: { ...boundingBox },
        normalizedBoundingBox: { ...boundingBox },
        snappingStrengthApplied: k,
        rotationDegrees: 0
      }
    };

    switch (shapeType) {
      case "line": {
        const start = corners[0] || { x: boundingBox.x, y: boundingBox.y };
        const end = corners[corners.length - 1] || { x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height };
        
        const snappedStart = this.snappingEngine.snapPoint(start);

        const rawDx = end.x - start.x;
        const rawDy = end.y - start.y;
        const rawAngle = Math.atan2(rawDy, rawDx);
        const snappedAngle = this.snappingEngine.snapAngle(rawAngle);

        const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
        const idealEnd = {
          x: snappedStart.x + Math.cos(snappedAngle) * dist,
          y: snappedStart.y + Math.sin(snappedAngle) * dist
        };

        const finalStart = this.interpolatePoint(start, snappedStart, k);
        const finalEnd = this.interpolatePoint(end, idealEnd, k);

        result.vertices = [finalStart, finalEnd];
        result.rotation = this.interpolateNumber(rawAngle, snappedAngle, k);
        result.metadata.rotationDegrees = (result.rotation * 180.0) / Math.PI;

        const minX = Math.min(finalStart.x, finalEnd.x);
        const minY = Math.min(finalStart.y, finalEnd.y);
        const maxX = Math.max(finalStart.x, finalEnd.x);
        const maxY = Math.max(finalStart.y, finalEnd.y);
        result.metadata.normalizedBoundingBox = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        };
        break;
      }

      case "circle": {
        const rawCenter = {
          x: boundingBox.x + boundingBox.width / 2.0,
          y: boundingBox.y + boundingBox.height / 2.0
        };
        const rawRadius = (boundingBox.width + boundingBox.height) / 4.0;

        const snappedCenter = this.snappingEngine.snapPoint(rawCenter);
        const snappedRadius = Math.round(rawRadius / (this.gridSize / 2)) * (this.gridSize / 2);

        const finalCenter = this.interpolatePoint(rawCenter, snappedCenter, k);
        const finalRadius = this.interpolateNumber(rawRadius, snappedRadius, k);

        result.center = finalCenter;
        result.radius = finalRadius;

        result.metadata.normalizedBoundingBox = {
          x: finalCenter.x - finalRadius,
          y: finalCenter.y - finalRadius,
          width: finalRadius * 2,
          height: finalRadius * 2
        };
        break;
      }

      case "ellipse": {
        const rawCenter = {
          x: boundingBox.x + boundingBox.width / 2.0,
          y: boundingBox.y + boundingBox.height / 2.0
        };
        const rawRx = boundingBox.width / 2.0;
        const rawRy = boundingBox.height / 2.0;

        const snappedCenter = this.snappingEngine.snapPoint(rawCenter);
        const snappedRx = Math.round(rawRx / (this.gridSize / 2)) * (this.gridSize / 2);
        const snappedRy = Math.round(rawRy / (this.gridSize / 2)) * (this.gridSize / 2);

        const finalCenter = this.interpolatePoint(rawCenter, snappedCenter, k);
        const finalRx = this.interpolateNumber(rawRx, snappedRx, k);
        const finalRy = this.interpolateNumber(rawRy, snappedRy, k);

        result.center = finalCenter;
        result.radiusX = finalRx;
        result.radiusY = finalRy;
        result.rotation = 0;

        result.metadata.normalizedBoundingBox = {
          x: finalCenter.x - finalRx,
          y: finalCenter.y - finalRy,
          width: finalRx * 2,
          height: finalRy * 2
        };
        break;
      }

      case "rectangle":
      case "square": {
        const rawCenter = {
          x: boundingBox.x + boundingBox.width / 2.0,
          y: boundingBox.y + boundingBox.height / 2.0
        };
        let rawW = boundingBox.width;
        let rawH = boundingBox.height;

        if (shapeType === "square") {
          const avg = (rawW + rawH) / 2.0;
          rawW = avg;
          rawH = avg;
        }

        const snappedCenter = this.snappingEngine.snapPoint(rawCenter);
        const snappedW = Math.round(rawW / this.gridSize) * this.gridSize;
        const snappedH = Math.round(rawH / this.gridSize) * this.gridSize;

        const finalCenter = this.interpolatePoint(rawCenter, snappedCenter, k);
        const finalW = this.interpolateNumber(rawW, snappedW, k);
        const finalH = this.interpolateNumber(rawH, snappedH, k);

        result.center = finalCenter;
        result.width = finalW;
        result.height = finalH;
        result.rotation = 0;

        result.metadata.normalizedBoundingBox = {
          x: finalCenter.x - finalW / 2.0,
          y: finalCenter.y - finalH / 2.0,
          width: finalW,
          height: finalH
        };
        break;
      }

      case "triangle":
      case "polygon":
      case "arrow":
      default: {
        if (corners.length > 0) {
          result.vertices = corners.map(pt => {
            const snappedPt = this.snappingEngine.snapPoint(pt);
            return this.interpolatePoint(pt, snappedPt, k);
          });

          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const pt of result.vertices) {
            if (pt.x < minX) minX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y > maxY) maxY = pt.y;
          }
          result.metadata.normalizedBoundingBox = {
            x: minX === Infinity ? 0 : minX,
            y: minY === Infinity ? 0 : minY,
            width: minX === Infinity ? 0 : maxX - minX,
            height: minY === Infinity ? 0 : maxY - minY
          };
        }
        break;
      }
    }

    return result;
  }

  private interpolatePoint(p1: Point2D, p2: Point2D, k: number): Point2D {
    return {
      x: p1.x + (p2.x - p1.x) * k,
      y: p1.y + (p2.y - p1.y) * k,
      ...(p1.t !== undefined ? { t: p1.t } : {})
    };
  }

  private interpolateNumber(n1: number, n2: number, k: number): number {
    return n1 + (n2 - n1) * k;
  }
}
