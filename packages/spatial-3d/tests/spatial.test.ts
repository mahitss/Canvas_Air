import { describe, it, expect, beforeEach } from "vitest";
import { MatrixMath } from "../src/math/matrix";
import { SceneGraph3D } from "../src/graph/scene";
import { AnchorManager } from "../src/anchors/manager";
import { SpatialInteractionEngine } from "../src/interaction/engine";
import { SceneNode3D, Ray3D } from "../src/types";

describe("Spatial Computing & 3D Canvas Engine", () => {
  let sceneGraph: SceneGraph3D;
  let anchorManager: AnchorManager;
  let interactionEngine: SpatialInteractionEngine;

  beforeEach(() => {
    sceneGraph = new SceneGraph3D();
    anchorManager = new AnchorManager();
    interactionEngine = new SpatialInteractionEngine();
  });

  it("should compute translation and scaling transformations in MatrixMath", () => {
    const identity = MatrixMath.createIdentity();
    
    // Translate identity matrix by (10, -5, 20)
    const translated = MatrixMath.translate(identity, 10, -5, 20);
    expect(translated[12]).toBe(10);
    expect(translated[13]).toBe(-5);
    expect(translated[14]).toBe(20);

    // Transform a Vector3 point using translation matrix
    const point = { x: 1, y: 1, z: 1 };
    const transformed = MatrixMath.transformVector(translated, point);
    expect(transformed.x).toBe(11);
    expect(transformed.y).toBe(-4);
    expect(transformed.z).toBe(21);
  });

  it("should recursively compose world matrices in hierarchical scene trees", () => {
    // Parent translated by (100, 0, 0)
    const parentLocal = MatrixMath.translate(MatrixMath.createIdentity(), 100, 0, 0);
    const parentNode: SceneNode3D = {
      id: "parent-node",
      name: "Parent",
      type: "group",
      localMatrix: parentLocal,
      worldMatrix: new Float32Array(16)
    };

    // Child translated relative to parent by (0, 50, 0)
    const childLocal = MatrixMath.translate(MatrixMath.createIdentity(), 0, 50, 0);
    const childNode: SceneNode3D = {
      id: "child-node",
      parentId: "parent-node",
      name: "Child",
      type: "mesh",
      localMatrix: childLocal,
      worldMatrix: new Float32Array(16)
    };

    sceneGraph.addNode(parentNode);
    sceneGraph.addNode(childNode);

    const child = sceneGraph.getNodes().find(n => n.id === "child-node")!;
    
    // Child's world position should inherit parent translation: (100, 50, 0)
    expect(child.worldMatrix[12]).toBe(100);
    expect(child.worldMatrix[13]).toBe(50);
    expect(child.worldMatrix[14]).toBe(0);
  });

  it("should register and clear spatial anchors in AnchorManager", () => {
    const pos = { x: 5, y: 10, z: -15 };
    const rot = { x: 0, y: 1.57, z: 0 };
    
    const anchor = anchorManager.createAnchor("Desk Anchor", pos, rot);
    expect(anchor.id).toBeDefined();
    expect(anchor.name).toBe("Desk Anchor");

    const list = anchorManager.getAnchors();
    expect(list.length).toBe(1);

    anchorManager.removeAnchor(anchor.id);
    expect(anchorManager.getAnchors().length).toBe(0);
  });

  it("should intersect ray directions against bounding sphere nodes", () => {
    const nodeMatrix = MatrixMath.translate(MatrixMath.createIdentity(), 0, 0, -10); // Sphere at (0, 0, -10)
    const node: SceneNode3D = {
      id: "target-mesh",
      name: "Target",
      type: "mesh",
      localMatrix: nodeMatrix,
      worldMatrix: nodeMatrix,
      boundingRadius: 2.0
    };

    const ray: Ray3D = {
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: -1 } // Ray looking straight down -Z
    };

    const hits = interactionEngine.raycast(ray, [node]);
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe("target-mesh");

    // Miss test: ray looking along +X axis
    const missRay: Ray3D = {
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 1, y: 0, z: 0 }
    };
    const missHits = interactionEngine.raycast(missRay, [node]);
    expect(missHits.length).toBe(0);
  });
});
