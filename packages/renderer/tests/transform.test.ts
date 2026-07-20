import { describe, it, expect } from "vitest";
import { TransformEngine } from "../src/utils/transform";
import { SceneNode } from "../src/scene/node";

describe("Matrix Transformations Engine", () => {
  it("should generate identity, translation, scale, rotation, and skew matrices correctly", () => {
    const ident = TransformEngine.identity();
    expect(ident).toEqual([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ]);

    const trans = TransformEngine.translate(10, 20);
    expect(trans[2]).toBe(10);
    expect(trans[5]).toBe(20);

    const sc = TransformEngine.scale(2, 3);
    expect(sc[0]).toBe(2);
    expect(sc[4]).toBe(3);

    const rot = TransformEngine.rotate(90);
    expect(rot[0]).toBeCloseTo(0, 5);
    expect(rot[1]).toBeCloseTo(-1, 5);

    const sk = TransformEngine.skew(45, 0); // tan(45) = 1
    expect(sk[1]).toBeCloseTo(1, 5);
    expect(sk[3]).toBeCloseTo(0, 5);
  });

  it("should multiply matrices and compute analytical inverse matrix", () => {
    const t = TransformEngine.translate(50, 100);
    const s = TransformEngine.scale(2.0, 2.0);

    const combined = TransformEngine.multiply(t, s);
    // [ 2, 0, 50 ]
    // [ 0, 2, 100 ]
    // [ 0, 0,  1 ]
    expect(combined[0]).toBe(2.0);
    expect(combined[2]).toBe(50);
    expect(combined[5]).toBe(100);

    // Verify matrix reuse
    const targetOut = [0, 0, 0, 0, 0, 0, 0, 0, 0] as any;
    const multiplied = TransformEngine.multiply(t, s, targetOut);
    expect(multiplied).toBe(targetOut);
    expect(multiplied[0]).toBe(2.0);

    const inv = TransformEngine.invert(combined, targetOut);
    expect(inv).toBe(targetOut);
    // Inverse should map back: [ 0.5, 0, -25 ], [ 0, 0.5, -50 ], [ 0, 0, 1 ]
    expect(inv[0]).toBe(0.5);
    expect(inv[2]).toBe(-25);
    expect(inv[5]).toBe(-50);
  });

  it("should project points and verify coordinate roundtrips under nested skew transformations", () => {
    const parent = new SceneNode("parent");
    parent.translateX = 100;
    parent.translateY = 50;
    parent.skewX = 30; // shear x

    const child = new SceneNode("child");
    child.translateX = 20;
    child.translateY = 10;
    child.scaleX = 2.0;

    parent.addChild(child);

    const worldWt = child.getWorldTransform();
    
    // Project local child center (0, 0) to world
    const childWorldPt = TransformEngine.transformPoint(worldWt, 0, 0);
    
    // Unproject world back to local child coordinates using inverse
    const invWt = TransformEngine.invert(worldWt);
    const childLocalPt = TransformEngine.transformPoint(invWt, childWorldPt.x, childWorldPt.y);

    expect(childLocalPt.x).toBeCloseTo(0, 3);
    expect(childLocalPt.y).toBeCloseTo(0, 3);
  });
});
