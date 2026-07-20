import { describe, it, expect, vi } from "vitest";
import { FormatRegistry } from "../src/registry/format_registry";
import { ExportPipeline } from "../src/pipeline/export_pipeline";
import { ImportPipeline } from "../src/pipeline/import_pipeline";
import { PngFileAdapter } from "../src/adapters/png_adapter";
import { SvgFileAdapter } from "../src/adapters/svg_adapter";
import { PdfFileAdapter } from "../src/adapters/pdf_adapter";
import { NativeProjectFileAdapter } from "../src/adapters/native_adapter";
import { DocumentValidationService, MetadataManager } from "../src/validation/validation_service";
import { VisionCanvasDoc } from "../src/domain";

describe("Universal Import / Export Adapters & Services", () => {
  const sampleDoc: VisionCanvasDoc = {
    id: "doc-spec",
    metadata: {
      title: "Design Plan",
      author: "Charlie",
      createdAt: 500,
      updatedAt: 500,
      schemaVersion: 2
    },
    canvas: { width: 1024, height: 768, backgroundColor: "#000" },
    layers: [
      { id: "layer-id", name: "Main", visible: true, opacity: 1, zIndex: 0 }
    ],
    objects: [
      {
        id: "stroke-1",
        type: "stroke",
        layerId: "layer-id",
        zIndex: 1,
        points: [{ x: 100, y: 150 }],
        color: "#ff00bb",
        brushWidth: 6
      }
    ],
    assets: [
      { id: "img-1", mimeType: "image/png", dataUrl: "data:image/png;base64,...", sizeBytes: 500 }
    ],
    history: { baseVersion: 1, patchSequence: 0, checkpointTimestamp: 500 }
  };

  it("should process document through Export Pipeline progress states and support cancellation", async () => {
    const registry = new FormatRegistry();
    const exportPipeline = new ExportPipeline(registry);

    const progressTracker: number[] = [];
    const payload = await exportPipeline.exportFile(sampleDoc, {
      format: "json",
      onProgress: (p) => progressTracker.push(p)
    });

    expect(payload).toBeDefined();
    expect(progressTracker).toContain(10);
    expect(progressTracker).toContain(100);

    // Cancellation support
    const controller = new AbortController();
    controller.abort();

    await expect(
      exportPipeline.exportFile(sampleDoc, {
        format: "json",
        signal: controller.signal
      })
    ).rejects.toThrow(/aborted/);
  });

  it("should embed metadata and import/export accurately using PNG, SVG, and PDF adapters", async () => {
    const registry = new FormatRegistry();
    registry.registerAdapter(new PngFileAdapter(), { import: true, export: true, maxSchemaVersionSupported: 2 });
    registry.registerAdapter(new SvgFileAdapter(), { import: true, export: true, maxSchemaVersionSupported: 2 });
    registry.registerAdapter(new PdfFileAdapter(), { import: true, export: true, maxSchemaVersionSupported: 2 });

    const pipeline = new ImportPipeline(registry);
    const exporter = new ExportPipeline(registry);

    // Test PNG flow
    const pngData = await exporter.exportFile(sampleDoc, { format: "png" });
    expect(pngData).toContain("\x89PNG");
    expect(pngData).toContain("<vcanvas-meta>");

    const importedPng = await pipeline.importFile("design.png", pngData);
    expect(importedPng.document.id).toBe("doc-spec");

    // Test SVG flow
    const svgData = await exporter.exportFile(sampleDoc, { format: "svg" });
    expect(svgData).toContain("<svg");
    expect(svgData).toContain("<path d=\"M 100 150\""); // verify vector path coordinates
    expect(svgData).toContain('stroke="#ff00bb"');

    const importedSvg = await pipeline.importFile("vector.svg", svgData);
    expect(importedSvg.document.metadata.title).toBe("Design Plan");

    // Test PDF flow
    const pdfData = await exporter.exportFile(sampleDoc, { format: "pdf" });
    expect(pdfData).toContain("%PDF");
    expect(pdfData).toContain("/VCanvasMeta");

    const importedPdf = await pipeline.importFile("sketch.pdf", pdfData);
    expect(importedPdf.document.canvas.width).toBe(1024);
  });

  it("should support compressed native format wrapper and check CRC32 signatures", async () => {
    const registry = new FormatRegistry();
    const adapter = new NativeProjectFileAdapter();
    registry.registerAdapter(adapter, { import: true, export: true, maxSchemaVersionSupported: 2 });

    const exporter = new ExportPipeline(registry);
    const importer = new ImportPipeline(registry);

    const nativeData = await exporter.exportFile(sampleDoc, { format: "vpx" });
    expect(nativeData).toContain("VisionCanvasNative");
    expect(nativeData).toContain("checksum");

    const importedNative = await importer.importFile("sketch.vpx", nativeData);
    expect(importedNative.document.id).toBe("doc-spec");
    expect(importedNative.document.objects[0]?.id).toBe("stroke-1");

    // Test checksum corruption
    const corruptedData = nativeData.replace(/"checksum": \d+/, '"checksum": 99999');
    await expect(
      importer.importFile("sketch.vpx", corruptedData)
    ).rejects.toThrow(/Checksum validation failed/);
  });

  it("should validate assets and references, and manage metadata updates", () => {
    // 1. Validation service testing
    const badDoc: VisionCanvasDoc = {
      ...sampleDoc,
      objects: [
        {
          id: "stroke-bad",
          type: "stroke",
          layerId: "non-existent-layer-id", // bad layer reference
          zIndex: 1,
          points: [{ x: 0, y: 0 }],
          color: "#fff",
          brushWidth: 1
        }
      ],
      assets: [
        { id: "asset-bad", mimeType: "application/zip", dataUrl: "...", sizeBytes: -50 } // bad size & bad mime
      ]
    };

    const verify = DocumentValidationService.validateDocument(badDoc);
    expect(verify.isValid).toBe(false);
    expect(verify.errors.some((e) => e.includes("ReferenceConflict"))).toBe(true);
    expect(verify.errors.some((e) => e.includes("unsupported mimeType"))).toBe(true);
    expect(verify.errors.some((e) => e.includes("size bounds are invalid"))).toBe(true);

    // 2. Metadata Manager testing
    const updatedMeta = MetadataManager.updateMetadata(sampleDoc.metadata, {
      title: "Modified Sketch",
      customProperties: { status: "released" }
    });

    expect(updatedMeta.title).toBe("Modified Sketch");
    expect(updatedMeta.createdAt).toBe(500); // preserves creation time
    expect(updatedMeta.customProperties.status).toBe("released");
  });
});
