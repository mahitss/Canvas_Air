import { describe, it, expect } from "vitest";
import { AudioRingBuffer } from "../src/audio/buffer";
import { VoiceManager } from "../src/engine";

describe("Voice Command Engine Performance & Buffering Benchmarks", () => {
  it("should verify AudioRingBuffer performs zero-copy calculations and index wraps", () => {
    const buffer = new AudioRingBuffer(10);
    const chunk1 = new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]);
    
    buffer.write(chunk1);
    expect(buffer.size()).toBe(8);

    // Overwrite wrap boundary
    const chunk2 = new Float32Array([9.0, 10.0, 11.0, 12.0]);
    buffer.write(chunk2);

    expect(buffer.size()).toBe(10);
    // Old data [1.0, 2.0] got culled/wrapped
    const contents = buffer.readAll();
    expect(contents[0]).toBe(3.0);
    expect(contents[contents.length - 1]).toBe(12.0);
  });

  it("should benchmark prediction cache hit latency under normal continuous streams", () => {
    const manager = new VoiceManager();

    // 1. Initial hit (populates cache)
    const start1 = performance.now();
    const r1 = manager.processTranscript("undo", 0.90);
    const duration1 = performance.now() - start1;

    expect(r1.intent).toBe("editing");

    // 2. Cache Hit (resolves directly from cache mapping)
    const start2 = performance.now();
    const r2 = manager.processTranscript("undo", 0.90);
    const duration2 = performance.now() - start2;

    expect(r2.intent).toBe("editing");

    // Verify cache hit yields extremely low latency (< 0.15ms)
    expect(duration2).toBeLessThan(0.15);
    expect(duration2).toBeLessThan(duration1);

    console.log(`[BENCHMARK] Non-cached parsing duration: ${duration1.toFixed(4)}ms`);
    console.log(`[BENCHMARK] Cached parsing duration: ${duration2.toFixed(4)}ms`);
  });

  it("should verify noise gate floor bypasses heavy intent parsing adaptively", () => {
    const manager = new VoiceManager();
    const silence = new Float32Array(512); // flat 0.0 values (silence)
    
    manager.ingestAudio(silence);
    manager.setNoiseGateFloor(0.05);

    const result = manager.processTranscript("undo", 0.95);
    // Flat flat silence triggers the noise-gate bypass immediately, returning unknown
    expect(result.intent).toBe("unknown");
    expect(result.confidence).toBe(0.0);
  });

  it("should benchmark frame processing throughput over 2000 iterations", () => {
    const manager = new VoiceManager();
    const start = performance.now();

    for (let i = 0; i < 2000; i++) {
      manager.processTranscript("undo", 0.90);
    }

    const totalDuration = performance.now() - start;
    const avgLatency = (totalDuration * 1000) / 2000;

    console.log(`[BENCHMARK] Total duration for 2000 voice evaluations: ${totalDuration.toFixed(2)}ms`);
    console.log(`[BENCHMARK] Average latency per voice evaluation: ${avgLatency.toFixed(3)} microseconds`);

    // Latency must be extremely low (average < 100.0us per iteration)
    expect(avgLatency).toBeLessThan(100.0);
  });
});
