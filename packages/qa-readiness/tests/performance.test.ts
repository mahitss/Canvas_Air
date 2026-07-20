import { describe, it, expect } from "vitest";
import { BenchmarkSuite } from "../src/performance/benchmark_suite";
import { QualityScaler } from "../src/performance/quality_scaler";
import { CrashRecoveryManager } from "../src/performance/crash_recovery";
import { StartupOptimizer } from "../src/performance/startup_optimizer";
import { MemoryMonitor } from "../src/performance/memory_monitor";

describe("QA Performance & Optimization Suite", () => {
  it("should sample FPS, frame time, gesture latency and generate reports", () => {
    const suite = new BenchmarkSuite();
    const r = suite.runBenchmarkCycle({ fps: 55, gestureLatencyMs: 4 });

    expect(r.fps).toBe(55);
    expect(r.gestureLatencyMs).toBe(4);
    expect(suite.getReports().length).toBe(1);

    const markdown = suite.generateMarkdownReport();
    expect(markdown).toContain("# Performance Benchmark Report");
    expect(markdown).toContain("Avg FPS: 55.0");
  });

  it("should dynamically scale down rendering particle budgets on low FPS or laptop batteries", () => {
    const scaler = new QualityScaler();

    // Normal high performance config
    const directivesHigh = scaler.evaluateQualityDirectives(60, false);
    expect(directivesHigh.maxParticles).toBe(5000);
    expect(directivesHigh.effectQuality).toBe("high");

    // Low FPS drops quality directives
    const directivesLow = scaler.evaluateQualityDirectives(30, false);
    expect(directivesLow.maxParticles).toBe(5000 / 10); // 500
    expect(directivesLow.effectQuality).toBe("medium");

    // Laptop battery drops quality directives
    const directivesBattery = scaler.evaluateQualityDirectives(60, true);
    expect(directivesBattery.maxParticles).toBe(500);

    // Idle drops performance
    scaler.setIdle(true);
    const directivesIdle = scaler.evaluateQualityDirectives(60, false);
    expect(directivesIdle.refreshRateHz).toBe(30);

    // Inactive app shuts down rendering
    scaler.setActive(false);
    const directivesInactive = scaler.evaluateQualityDirectives(60, false);
    expect(directivesInactive.maxParticles).toBe(0);
  });

  it("should reinitialize components and return mock-provider fallbacks on failure", () => {
    const recovery = new CrashRecoveryManager();

    expect(recovery.handleFailure("camera")).toBe("reinitialize");
    expect(recovery.handleFailure("gpu")).toBe("fallback-cpu");
    expect(recovery.handleFailure("ai")).toBe("mock-provider");

    expect(recovery.getStats().cameraFailures).toBe(1);
    expect(recovery.getStats().gpuResets).toBe(1);
  });

  it("should measure cold boot startup latencies vs cached state timings", () => {
    const optimizer = new StartupOptimizer();

    const coldTraces = optimizer.measureStartupOverhead();
    expect(coldTraces.bootTimeMs).toBe(1200);
    expect(coldTraces.cameraInitMs).toBe(800);

    optimizer.warmCache();
    const warmTraces = optimizer.measureStartupOverhead();
    expect(warmTraces.bootTimeMs).toBe(150);
  });

  it("should track texturing allocations limits and cache health leaks", () => {
    const monitor = new MemoryMonitor();
    monitor.allocateTexture();
    monitor.reuseBuffer();
    monitor.writeToCache(50);

    const footprint = monitor.evaluateMemoryHealth();
    expect(footprint.allocatedTextures).toBe(1);
    expect(footprint.reusedBuffersCount).toBe(1);
    expect(footprint.unboundedCacheSize).toBe(50);
    expect(footprint.hasLeaks).toBe(false);

    // Allocate excessive textures to trigger leaks warning
    for (let i = 0; i < 150; i++) {
      monitor.allocateTexture();
    }
    expect(monitor.evaluateMemoryHealth().hasLeaks).toBe(true);
  });
});
