import { describe, it, expect } from "vitest";
import { CanonicalDocumentModelManager } from "../src/document/model";
import { VisionCanvasDoc } from "../src/domain";

describe("Canonical VisionCanvas Document Model", () => {
  const validDoc: VisionCanvasDoc = {
    id: "doc-123",
    metadata: {
      title: "My Sketch",
      author: "Alice",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      schemaVersion: 2
    },
    canvas: {
      width: 1920,
      height: 1080,
      backgroundColor: "#ffffff"
    },
    layers: [
      { id: "layer-1", name: "Layer 1", visible: true, opacity: 1, zIndex: 0 }
    ],
    objects: [
      {
        id: "stroke-1",
        type: "stroke",
        layerId: "layer-1",
        zIndex: 1,
        points: [{ x: 0, y: 0, pressure: 0.5 }],
        color: "#000000",
        brushWidth: 5
      }
    ],
    assets: [],
    history: {
      baseVersion: 1,
      patchSequence: 0,
      checkpointTimestamp: Date.now()
    }
  };

  it("should validate a correct document structure without errors", () => {
    const errors = CanonicalDocumentModelManager.validate(validDoc);
    expect(errors.length).toBe(0);
  });

  it("should flag validation errors on invalid shapes or boundaries", () => {
    const invalidDoc: any = {
      id: "",
      metadata: {
        title: "",
        author: "Alice"
        // missing schemaVersion
      },
      canvas: {
        width: -100,
        height: 0
      },
      layers: {} // should be array
    };

    const errors = CanonicalDocumentModelManager.validate(invalidDoc);
    expect(errors).toContain("Missing document ID");
    expect(errors).toContain("Metadata: title is required");
    expect(errors).toContain("Metadata: schemaVersion must be a number");
    expect(errors).toContain("Canvas width and height must be positive numbers");
    expect(errors).toContain("Layers must be an array");
  });

  it("should enforce complete immutability using deep freeze", () => {
    const doc = CanonicalDocumentModelManager.deepFreeze(JSON.parse(JSON.stringify(validDoc)));
    expect(Object.isFrozen(doc)).toBe(true);
    expect(Object.isFrozen(doc.metadata)).toBe(true);
    expect(Object.isFrozen(doc.objects[0])).toBe(true);

    expect(() => {
      (doc as any).id = "mutated-id";
    }).toThrow();

    expect(() => {
      (doc.metadata as any).title = "New Title";
    }).toThrow();
  });

  it("should upgrade schema version 1 documents to version 2 (backward compatibility)", () => {
    const oldDoc: any = {
      id: "doc-old",
      metadata: {
        title: "Old Doc",
        author: "Bob",
        createdAt: 10000,
        updatedAt: 10000,
        schemaVersion: 1
      },
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: "#000000"
      },
      layers: [],
      objects: [
        {
          id: "stroke-old",
          type: "stroke",
          // missing layerId and zIndex
          points: [{ x: 5, y: 5 }],
          color: "#ff0000",
          brushWidth: 3
        }
      ],
      assets: [],
      history: {
        baseVersion: 1,
        patchSequence: 0,
        checkpointTimestamp: 10000
      }
    };

    const upgraded = CanonicalDocumentModelManager.upgrade(oldDoc);
    expect(upgraded.metadata.schemaVersion).toBe(2);
    expect(upgraded.objects[0]?.layerId).toBe("default-layer");
    expect(upgraded.objects[0]?.zIndex).toBe(0);
  });
});
