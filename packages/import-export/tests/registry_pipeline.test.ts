import { describe, it, expect } from "vitest";
import { FormatRegistry } from "../src/registry/format_registry";
import { ImportPipeline } from "../src/pipeline/import_pipeline";
import { IFileAdapter } from "../src/interfaces";
import { VisionCanvasDoc } from "../src/domain";

describe("Format Registry & Import Pipeline", () => {
  const mockDoc: VisionCanvasDoc = {
    id: "doc-test",
    metadata: {
      title: "Test Canvas",
      author: "Alice",
      createdAt: 100,
      updatedAt: 100,
      schemaVersion: 2
    },
    canvas: { width: 100, height: 100, backgroundColor: "#fff" },
    layers: [{ id: "l-1", name: "L1", visible: true, opacity: 1, zIndex: 0 }],
    objects: [
      { id: "s-1", type: "stroke", layerId: "l-1", zIndex: 1, points: [{ x: 0, y: 0 }], color: "#000", brushWidth: 2 }
    ],
    assets: [],
    history: { baseVersion: 1, patchSequence: 0, checkpointTimestamp: 100 }
  };

  class MockCsvAdapter implements IFileAdapter {
    public readonly supportedExtensions = ["csv", "txt"];
    public async importFile(data: ArrayBuffer | string): Promise<VisionCanvasDoc> {
      return mockDoc;
    }
    public async exportFile(doc: VisionCanvasDoc): Promise<ArrayBuffer | string> {
      return "mock-csv-data";
    }
  }

  it("should manage adapter registrations, capabilities, and removals in FormatRegistry", () => {
    const registry = new FormatRegistry();
    const adapter = new MockCsvAdapter();

    // Registry capabilities checks
    expect(registry.canImport("csv")).toBe(false); // not registered yet

    registry.registerAdapter(adapter, {
      import: true,
      export: true,
      maxSchemaVersionSupported: 2
    });

    expect(registry.canImport(".CSV")).toBe(true); // check dot removal and case insensitivity
    expect(registry.canExport("txt")).toBe(true);

    const lookup = registry.lookupAdapter("csv");
    expect(lookup).toBe(adapter);

    registry.removeAdapter(adapter);
    expect(registry.canImport("csv")).toBe(false);
  });

  it("should process import pipeline with validation, upgrades, and partial failure recovery", async () => {
    const registry = new FormatRegistry();
    const pipeline = new ImportPipeline(registry);

    // Create custom payload with one valid element and one corrupted element
    const rawDocumentPayload: any = {
      id: "doc-imported",
      metadata: {
        title: "Imported Canvas",
        author: "Bob",
        createdAt: 200,
        updatedAt: 200,
        schemaVersion: 1 // version 1 to trigger auto-upgrade!
      },
      canvas: { width: 800, height: 600, backgroundColor: "#fff" },
      layers: [],
      objects: [
        // Valid element (will be upgraded with default layerId/zIndex)
        {
          id: "stroke-valid",
          type: "stroke",
          points: [{ x: 5, y: 10 }],
          color: "#000",
          brushWidth: 3
        },
        // Corrupted element (lacks id and type)
        {
          points: []
        },
        // Empty stroke element (should be skipped with warnings)
        {
          id: "stroke-empty",
          type: "stroke",
          points: [],
          color: "#ff0000",
          brushWidth: 4
        }
      ],
      assets: [],
      history: { baseVersion: 1, patchSequence: 0, checkpointTimestamp: 200 }
    };

    const payloadString = JSON.stringify(rawDocumentPayload);
    const result = await pipeline.importFile("workspace.json", payloadString);

    expect(result.document.metadata.schemaVersion).toBe(2); // Auto upgraded
    expect(result.document.objects.length).toBe(1); // Skips the corrupted/empty ones
    expect(result.document.objects[0]?.id).toBe("stroke-valid");
    expect(result.document.objects[0]?.layerId).toBe("default-layer"); // Default layer set by upgrade

    // Partial recovery warning checks
    expect(result.warnings.length).toBe(2);
    expect(result.warnings[0]).toContain("Skipped corrupted object");
    expect(result.warnings[1]).toContain("Skipped empty stroke object");
  });
});
