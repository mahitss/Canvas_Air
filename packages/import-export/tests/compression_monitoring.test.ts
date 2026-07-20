import { describe, it, expect } from "vitest";
import { LosslessCompressor, ChunkReader, ChunkWriter } from "../src/compression/compression_service";
import { IoTelemetryMonitor } from "../src/debug/monitoring";

describe("Compression & Telemetry Monitoring Service", () => {
  it("should compress and decompress coordinates sequences using Run-Length Encoding", () => {
    const raw = "AAAAABBBCCCCCCDDDD";
    const compressed = LosslessCompressor.compress(raw);
    expect(compressed).toBe("5A3B6C4D");

    const decompressed = LosslessCompressor.decompress(compressed);
    expect(decompressed).toBe(raw);
  });

  it("should compress and decompress streams and perform incremental serialization", async () => {
    const chunks = ["AAA", "BBB", "CCC"];
    let readIndex = 0;

    const reader: ChunkReader = {
      read: async () => {
        if (readIndex < chunks.length) {
          const val = chunks[readIndex];
          readIndex++;
          return { value: val, done: false };
        }
        return { value: undefined, done: true };
      }
    };

    const writtenChunks: string[] = [];
    const writer: ChunkWriter = {
      write: async (chunk) => {
        writtenChunks.push(chunk);
      }
    };

    // Streaming compression
    await LosslessCompressor.compressStream(reader, writer);
    expect(writtenChunks).toEqual(["3A", "3B", "3C"]);

    // Incremental serialization
    const objects = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }];
    const serializedChunks: string[] = [];
    const serializingWriter: ChunkWriter = {
      write: async (chunk) => {
        serializedChunks.push(chunk);
      }
    };

    await LosslessCompressor.serializeIncremental(objects, 2, serializingWriter); // chunk size 2
    expect(serializedChunks.length).toBe(2);
    expect(serializedChunks[0]).toContain("1");
    expect(serializedChunks[0]).toContain("2");
  });

  it("should record metrics and verify average telemetry counters", () => {
    const monitor = new IoTelemetryMonitor();

    monitor.recordImport(100, 5000);
    monitor.recordImport(200, 7000);
    monitor.recordExport(150, 10000, 5000); // 0.5 ratio
    monitor.recordFailure();
    monitor.recordAdapterUsage("SVG");
    monitor.recordAdapterUsage("SVG");

    const stats = monitor.getStats();
    expect(stats.importDurationAvgMs).toBe(150); // (100 + 200) / 2
    expect(stats.exportDurationAvgMs).toBe(150);
    expect(stats.fileSizeAvgBytes).toBe(7333); // (5000 + 7000 + 10000) / 3
    expect(stats.compressionRatioAvg).toBe(0.5);
    expect(stats.failuresCount).toBe(1);
    expect(stats.adapterUsages["SVG"]).toBe(2);

    expect(Object.isFrozen(stats)).toBe(true);
  });
});
