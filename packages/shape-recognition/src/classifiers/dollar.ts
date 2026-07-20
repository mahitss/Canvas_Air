import { Point2D, ShapeType } from "../types";

export interface DollarTemplate {
  name: ShapeType;
  points: Point2D[];
}

export class DollarClassifier {
  private templates: DollarTemplate[] = [];
  private static readonly RESAMPLE_COUNT = 64;
  private static readonly BOUNDING_BOX_SIZE = 250.0;
  private static readonly HALF_DIAGONAL = 0.5 * Math.sqrt(2 * DollarClassifier.BOUNDING_BOX_SIZE * DollarClassifier.BOUNDING_BOX_SIZE);

  constructor() {
    this.loadBuiltInTemplates();
  }

  private loadBuiltInTemplates(): void {
    // Generate mathematical points for built-in shapes to use as templates

    // 1. Circle Template
    const circlePoints: Point2D[] = [];
    for (let i = 0; i < DollarClassifier.RESAMPLE_COUNT; i++) {
      const angle = (i * Math.PI * 2) / (DollarClassifier.RESAMPLE_COUNT - 1);
      circlePoints.push({ x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 });
    }
    this.registerTemplate("circle", circlePoints);

    // 2. Square/Rectangle Template
    const rectPoints: Point2D[] = [];
    // Draw square: top, right, bottom, left
    const seg = DollarClassifier.RESAMPLE_COUNT / 4;
    for (let i = 0; i < seg; i++) rectPoints.push({ x: -100 + (i / seg) * 200, y: -100 });
    for (let i = 0; i < seg; i++) rectPoints.push({ x: 100, y: -100 + (i / seg) * 200 });
    for (let i = 0; i < seg; i++) rectPoints.push({ x: 100 - (i / seg) * 200, y: 100 });
    for (let i = 0; i < seg; i++) rectPoints.push({ x: -100, y: 100 - (i / seg) * 200 });
    this.registerTemplate("rectangle", rectPoints);

    // 3. Triangle Template
    const triPoints: Point2D[] = [];
    const triSeg = DollarClassifier.RESAMPLE_COUNT / 3;
    for (let i = 0; i < triSeg; i++) triPoints.push({ x: (i / triSeg) * 100, y: -100 + (i / triSeg) * 200 });
    for (let i = 0; i < triSeg; i++) triPoints.push({ x: 100 - (i / triSeg) * 200, y: 100 });
    for (let i = 0; i < triSeg; i++) triPoints.push({ x: -100 + (i / triSeg) * 100, y: 100 - (i / triSeg) * 200 });
    this.registerTemplate("triangle", triPoints);

    // 4. Star Template
    const starPoints: Point2D[] = [];
    const outerRadius = 100;
    const innerRadius = 40;
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      starPoints.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    this.registerTemplate("star", starPoints);

    // 5. Arrow Template (shaft then wing return loop)
    const arrowPoints: Point2D[] = [];
    const shaftSteps = 32;
    for (let i = 0; i < shaftSteps; i++) {
      arrowPoints.push({ x: -100 + (i / shaftSteps) * 200, y: 0 }); // Shaft to tip (100, 0)
    }
    const wingSteps = 16;
    for (let i = 0; i < wingSteps; i++) {
      arrowPoints.push({ x: 100 - (i / wingSteps) * 50, y: -(i / wingSteps) * 50 }); // Tip to upper wing tip
    }
    for (let i = 0; i < wingSteps; i++) {
      arrowPoints.push({ x: 50 + (i / wingSteps) * 50, y: -50 + (i / wingSteps) * 50 }); // Back to tip
    }
    for (let i = 0; i < wingSteps; i++) {
      arrowPoints.push({ x: 100 - (i / wingSteps) * 50, y: (i / wingSteps) * 50 }); // Tip to lower wing tip
    }
    this.registerTemplate("arrow", arrowPoints);

    // 6. Polygon Template (Pentagon)
    const pentagonPoints: Point2D[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 5;
      pentagonPoints.push({ x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 });
    }
    this.registerTemplate("polygon", pentagonPoints);

    // 7. Ellipse Template (stretched circle)
    const ellipsePoints: Point2D[] = [];
    for (let i = 0; i < DollarClassifier.RESAMPLE_COUNT; i++) {
      const angle = (i * Math.PI * 2) / (DollarClassifier.RESAMPLE_COUNT - 1);
      ellipsePoints.push({ x: Math.cos(angle) * 150, y: Math.sin(angle) * 75 });
    }
    this.registerTemplate("ellipse", ellipsePoints);
  }


  public registerTemplate(name: ShapeType, points: Point2D[]): void {
    this.templates.push({
      name,
      points: this.preprocessPoints(points)
    });
  }

  /**
   * Evaluates input path coordinates and returns the template match name and confidence.
   */
  public classify(points: Point2D[]): { shapeType: ShapeType; confidence: number } {
    if (points.length < 3) {
      return { shapeType: "unknown", confidence: 0.0 };
    }

    const processedCandidate = this.preprocessPoints(points);
    
    let bestScore = -1;
    let bestMatchName: ShapeType = "unknown";

    for (const template of this.templates) {
      const distance = this.getPathDistance(processedCandidate, template.points);
      // Normalized score: 1.0 - (distance / half-diagonal of bounding box)
      const score = Math.max(0.0, 1.0 - distance / DollarClassifier.HALF_DIAGONAL);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatchName = template.name;
      }
    }

    return {
      shapeType: bestMatchName,
      confidence: bestScore
    };
  }

  private preprocessPoints(points: Point2D[]): Point2D[] {
    let pts = this.resample(points, DollarClassifier.RESAMPLE_COUNT);
    const centroid = this.getCentroid(pts);
    
    // Rotate to align indicative angle to 0.0
    const angle = Math.atan2(centroid.y - pts[0]!.y, centroid.x - pts[0]!.x);
    pts = this.rotateBy(pts, -angle, centroid);
    
    // Scale non-uniformly to bounding box size
    pts = this.scaleTo(pts, DollarClassifier.BOUNDING_BOX_SIZE);
    
    // Translate back to origin
    const newCentroid = this.getCentroid(pts);
    pts = this.translateTo(pts, { x: 0, y: 0 }, newCentroid);
    
    return pts;
  }

  private resample(points: Point2D[], count: number): Point2D[] {
    const interval = this.getPathLength(points) / (count - 1);
    let accumulatedDist = 0.0;
    const newPoints: Point2D[] = [points[0]!];

    let i = 1;
    let currPt = points[0]!;

    while (i < points.length) {
      const nextPt = points[i]!;
      const d = this.getDistance(currPt, nextPt);

      if (accumulatedDist + d >= interval) {
        const ratio = (interval - accumulatedDist) / d;
        const q = {
          x: currPt.x + ratio * (nextPt.x - currPt.x),
          y: currPt.y + ratio * (nextPt.y - currPt.y)
        };
        newPoints.push(q);
        currPt = q;
        accumulatedDist = 0.0;
      } else {
        accumulatedDist += d;
        currPt = nextPt;
        i++;
      }
    }

    // Ensure we match exact count constraints
    while (newPoints.length < count) {
      newPoints.push(points[points.length - 1]!);
    }
    if (newPoints.length > count) {
      newPoints.length = count;
    }

    return newPoints;
  }

  private rotateBy(points: Point2D[], angle: number, centroid: Point2D): Point2D[] {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return points.map(p => ({
      x: (p.x - centroid.x) * cos - (p.y - centroid.y) * sin + centroid.x,
      y: (p.x - centroid.x) * sin + (p.y - centroid.y) * cos + centroid.y
    }));
  }

  private scaleTo(points: Point2D[], size: number): Point2D[] {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const width = maxX - minX;
    const height = maxY - minY;
    return points.map(p => ({
      x: p.x * (size / (width || 1.0)),
      y: p.y * (size / (height || 1.0))
    }));
  }

  private translateTo(points: Point2D[], target: Point2D, centroid: Point2D): Point2D[] {
    const dx = target.x - centroid.x;
    const dy = target.y - centroid.y;
    return points.map(p => ({ x: p.x + dx, y: p.y + dy }));
  }

  private getPathLength(points: Point2D[]): number {
    let sum = 0;
    for (let i = 1; i < points.length; i++) {
      sum += this.getDistance(points[i - 1]!, points[i]!);
    }
    return sum;
  }

  private getPathDistance(pts1: Point2D[], pts2: Point2D[]): number {
    let sum = 0.0;
    const len = Math.min(pts1.length, pts2.length);
    for (let i = 0; i < len; i++) {
      sum += this.getDistance(pts1[i]!, pts2[i]!);
    }
    return sum / len;
  }

  private getCentroid(points: Point2D[]): Point2D {
    let x = 0, y = 0;
    for (const p of points) {
      x += p.x;
      y += p.y;
    }
    return { x: x / points.length, y: y / points.length };
  }

  private getDistance(p1: Point2D, p2: Point2D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
export * from "../types";
