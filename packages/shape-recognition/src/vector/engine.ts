import { ShapeType, BoundingBox2D, Point2D } from "../types";

export class VectorObject {
  public id: string;
  public shapeType: ShapeType;
  
  // Transform states
  public x: number = 0;
  public y: number = 0;
  public width: number = 100;
  public height: number = 100;
  public rotation: number = 0; // Degrees

  // Styling
  public fillColor: string = "transparent";
  public strokeColor: string = "#000000";
  public strokeWidth: number = 2.0;
  public opacity: number = 1.0;
  
  public layerId: string | null = null;
  public corners: Point2D[] = [];

  constructor(id: string, shapeType: ShapeType) {
    this.id = id;
    this.shapeType = shapeType;
  }

  public resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
  }

  public rotate(deg: number): void {
    this.rotation = (this.rotation + deg) % 360;
  }

  public move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }
}

export class VectorEngine {
  /**
   * Generates a precise vector object model based on classified shape metadata and coordinates.
   */
  public generateVector(
    shapeType: ShapeType,
    bbox: BoundingBox2D,
    corners: Point2D[] = []
  ): VectorObject {
    const id = `vector-${Math.random().toString(36).substr(2, 9)}`;
    const obj = new VectorObject(id, shapeType);
    
    // Set position to bbox center
    obj.x = bbox.x + bbox.width / 2.0;
    obj.y = bbox.y + bbox.height / 2.0;
    
    obj.width = bbox.width;
    obj.height = bbox.height;
    obj.corners = [...corners];

    return obj;
  }
}
