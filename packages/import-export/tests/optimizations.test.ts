import { describe, it, expect } from "vitest";
import { IoOptimizer } from "../src/debug/optimizations";
import { FormatRegistry } from "../src/registry/format_registry";
import { ImportPipeline } from "../src/pipeline/import_pipeline";
import { CanonicalDocumentModelManager } from "../src/document/model";
import { VisionCanvasDoc } from "../src/domain";

describe("Import / Export Optimization & Security Audit Checks", () => {
  it("should reuse ArrayBuffer instances from pool and process assets in parallel", async () => {
    // Acquire & Release
    const buf = IoOptimizer.acquireBuffer(1024);
    expect(buf.byteLength).toBeGreaterThanOrEqual(1024);
    IoOptimizer.releaseBuffer(buf);

    const reacquired = IoOptimizer.acquireBuffer(512);
    expect(reacquired).toBe(buf); // same buffer reused!

    // Parallel processing
    const assets = [
      { id: "a1", mimeType: "image/png", dataUrl: "d1", sizeBytes: 100 },
      { id: "a2", mimeType: "image/png", dataUrl: "d2", sizeBytes: 200 }
    ];
    const results = await IoOptimizer.processAssetsInParallel(assets, 2);
    expect(results.length).toBe(2);
    expect(results[0]?.id).toBe("a1");
  });

  it("should reject path traversal attempts inside ImportPipeline", async () => {
    const registry = new FormatRegistry();
    const pipeline = new ImportPipeline(registry);

    await expect(
      pipeline.importFile("../unsafe.json", "{}")
    ).rejects.toThrow(/Path traversal/);

    await expect(
      pipeline.importFile("dir\\unsafe.json", "{}")
    ).rejects.toThrow(/Path traversal/);
  });

  it("should run large document import benchmarks and complete validation efficiently", () => {
    const validDoc: VisionCanvasDoc = {
      id: "doc-benchmark",
      metadata: {
        title: "Benchmark",
        author: "Tester",
        createdAt: 100,
        updatedAt: 100,
        schemaVersion: 2
      },
      canvas: { width: 800, height: 600, backgroundColor: "#fff" },
      layers: [{ id: "l1", name: "Layer 1", visible: true, opacity: 1, zIndex: 0 }],
      objects: [],
      assets: [],
      history: { baseVersion: 1, patchSequence: 0, checkpointTimestamp: 100 }
    };

    // Populate with 10,000 stroke objects
    const objects = [];
    for (let i = 0; i < 10000; i++) {
      objects.push({
        id: `stroke-${i}`,
        type: "stroke" as const,
        layerId: "l1",
        zIndex: i,
        points: [{ x: i, y: i * 2 }],
        color: "#000000",
        brushWidth: 1
      });
    }

    const testDoc: VisionCanvasDoc = {
      ...validDoc,
      objects
    };

    const start = Date.now();
    const errors = CanonicalDocumentModelManager.validate(testDoc);
    const duration = Date.now() - start;

    console.log(`[Large File Benchmark] Validated 10,000 shapes in ${duration}ms`);
    expect(errors.length).toBe(0);
    expect(duration).toBeLessThan(1000); // must run in under 1000ms
  });
});
