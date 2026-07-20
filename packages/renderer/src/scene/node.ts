import { BoundingBox, Matrix3 } from "../types";
import { TransformEngine } from "../utils/transform";

/**
 * SceneNode represents a single hierarchical visual element within the Scene Graph.
 * Supports lazy transformation matrix caching, skewing, dirty-flag cascades,
 * selection states, bounding box updates, and point-in-bounds hit-testing.
 */
export class SceneNode {
  public id: string;
  public type: string;
  public parent: SceneNode | null = null;
  public children: SceneNode[] = [];

  // Backing fields for transform components
  private _translateX = 0;
  private _translateY = 0;
  private _rotation = 0; // Degrees
  private _scaleX = 1;
  private _scaleY = 1;
  private _skewX = 0; // Degrees
  private _skewY = 0; // Degrees

  // Backing fields for visibility and opacity
  private _isVisible = true;
  private _opacity = 1.0;

  // Selection states
  public isSelected = false;

  // Bounding Box in local coordinate limits
  public localBounds: BoundingBox = { xMin: -50, yMin: -50, xMax: 50, yMax: 50 };

  // Optimization Caching Layers
  private isDirty = true;
  private localMatrix: Matrix3 | null = null;
  private worldMatrix: Matrix3 | null = null;
  private cachedWorldBounds: BoundingBox | null = null;

  constructor(id: string, type = "BaseNode") {
    this.id = id;
    this.type = type;
  }

  // Getters and Setters cascading dirty updates down the subtree
  public get translateX(): number {
    return this._translateX;
  }
  public set translateX(value: number) {
    if (this._translateX !== value) {
      this._translateX = value;
      this.setDirty();
    }
  }

  public get translateY(): number {
    return this._translateY;
  }
  public set translateY(value: number) {
    if (this._translateY !== value) {
      this._translateY = value;
      this.setDirty();
    }
  }

  public get rotation(): number {
    return this._rotation;
  }
  public set rotation(value: number) {
    if (this._rotation !== value) {
      this._rotation = value;
      this.setDirty();
    }
  }

  public get scaleX(): number {
    return this._scaleX;
  }
  public set scaleX(value: number) {
    if (this._scaleX !== value) {
      this._scaleX = value;
      this.setDirty();
    }
  }

  public get scaleY(): number {
    return this._scaleY;
  }
  public set scaleY(value: number) {
    if (this._scaleY !== value) {
      this._scaleY = value;
      this.setDirty();
    }
  }

  public get skewX(): number {
    return this._skewX;
  }
  public set skewX(value: number) {
    if (this._skewX !== value) {
      this._skewX = value;
      this.setDirty();
    }
  }

  public get skewY(): number {
    return this._skewY;
  }
  public set skewY(value: number) {
    if (this._skewY !== value) {
      this._skewY = value;
      this.setDirty();
    }
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }
  public set isVisible(value: boolean) {
    if (this._isVisible !== value) {
      this._isVisible = value;
      this.setDirty();
    }
  }

  public get opacity(): number {
    return this._opacity;
  }
  public set opacity(value: number) {
    if (this._opacity !== value) {
      this._opacity = value;
      this.setDirty();
    }
  }

  /**
   * Adds a child node, removing it from any previous parent first.
   */
  public addChild(node: SceneNode): void {
    if (node.parent) {
      node.parent.removeChild(node);
    }
    node.parent = this;
    this.children.push(node);
    node.setDirty();
  }

  /**
   * Removes a child node.
   */
  public removeChild(node: SceneNode): void {
    const idx = this.children.indexOf(node);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      node.parent = null;
      node.setDirty();
    }
  }

  /**
   * Recursively dirty flags this node and all of its descendants.
   */
  public setDirty(): void {
    if (this.isDirty) return;
    
    this.isDirty = true;
    this.localMatrix = null;
    this.worldMatrix = null;
    this.cachedWorldBounds = null;

    for (const child of this.children) {
      child.setDirty();
    }
  }

  /**
   * Computes the local transform matrix M = T * R * K * S.
   * Leverages caching to avoid matrix generation overhead.
   */
  public getLocalTransform(): Matrix3 {
    if (this.localMatrix) {
      return this.localMatrix;
    }

    const t = TransformEngine.translate(this._translateX, this._translateY);
    const r = TransformEngine.rotate(this._rotation);
    const s = TransformEngine.scale(this._scaleX, this._scaleY);
    const k = TransformEngine.skew(this._skewX, this._skewY);

    const rk = TransformEngine.multiply(r, k);
    const rks = TransformEngine.multiply(rk, s);
    this.localMatrix = TransformEngine.multiply(t, rks);

    return this.localMatrix;
  }

  /**
   * Recursively computes world transformation matrix by multiplying up the hierarchy path.
   * Bypasses calculation checks if parent and self are clean.
   */
  public getWorldTransform(): Matrix3 {
    if (this.worldMatrix && !this.isDirty) {
      return this.worldMatrix;
    }

    const local = this.getLocalTransform();
    if (!this.parent) {
      this.worldMatrix = local;
      this.isDirty = false;
      return this.worldMatrix;
    }
    
    const parentWorld = this.parent.getWorldTransform();
    this.worldMatrix = TransformEngine.multiply(parentWorld, local);
    this.isDirty = false;
    return this.worldMatrix;
  }

  /**
   * Returns calculated absolute world opacity by traversing parents.
   */
  public getWorldOpacity(): number {
    if (!this.parent) {
      return this._opacity;
    }
    return this.parent.getWorldOpacity() * this._opacity;
  }

  /**
   * Returns calculated absolute world visibility. If any parent is invisible, returns false.
   */
  public getWorldVisibility(): boolean {
    if (!this._isVisible) {
      return false;
    }
    if (!this.parent) {
      return true;
    }
    return this.parent.getWorldVisibility();
  }

  /**
   * Performs spatial point hit testing in world coordinates.
   * Walks the node tree depth-first (checking children in reverse order so top-most is matched first).
   */
  public hitTest(worldX: number, worldY: number): SceneNode | null {
    if (!this.getWorldVisibility()) {
      return null;
    }

    // Traverse children first (top-most layer rendering first in reverse order)
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child) {
        const hit = child.hitTest(worldX, worldY);
        if (hit) return hit;
      }
    }

    const bounds = this.getWorldBounds();
    const isHit =
      worldX >= bounds.xMin &&
      worldX <= bounds.xMax &&
      worldY >= bounds.yMin &&
      worldY <= bounds.yMax;

    return isHit ? this : null;
  }

  /**
   * Calculates world bounds by projecting local bounds with the world matrix.
   * Caches results to prevent CPU project calculation loops.
   */
  public getWorldBounds(): BoundingBox {
    if (this.cachedWorldBounds) {
      return this.cachedWorldBounds;
    }

    const wt = this.getWorldTransform();
    
    const corners = [
      TransformEngine.transformPoint(wt, this.localBounds.xMin, this.localBounds.yMin),
      TransformEngine.transformPoint(wt, this.localBounds.xMax, this.localBounds.yMin),
      TransformEngine.transformPoint(wt, this.localBounds.xMin, this.localBounds.yMax),
      TransformEngine.transformPoint(wt, this.localBounds.xMax, this.localBounds.yMax)
    ];

    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);

    this.cachedWorldBounds = {
      xMin: Math.min(...xs),
      yMin: Math.min(...ys),
      xMax: Math.max(...xs),
      yMax: Math.max(...ys)
    };
    return this.cachedWorldBounds;
  }
}
