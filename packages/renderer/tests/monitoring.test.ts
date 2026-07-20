import { describe, it, expect } from "vitest";
import { RenderMonitoringService } from "../src/debug/monitoring";
import { GPUResourceManager } from "../src/gpu/manager";

describe("Rendering Metrics & Monitoring Service", () => {
  it("should initialize metrics to base default levels", () => {
    const monitor = new RenderMonitoringService();
    const metrics = monitor.getMetrics();

    expect(metrics.fps).toBe(60);
    expect(metrics.drawCallsCount).toBe(0);
    expect(metrics.trianglesCount).toBe(0);
  });

  it("should record frame processing cycles and track queue lengths and draw stats", () => {
    const monitor = new RenderMonitoringService();

    monitor.beginFrame();
    // Simulate drawing work time
    const start = performance.now();
    while (performance.now() - start < 5) {
      // block for 5ms
    }

    monitor.endFrame(12, 24, 5);
    const metrics = monitor.getMetrics();

    expect(metrics.cpuTimeMs).toBeGreaterThanOrEqual(4.5);
    expect(metrics.frameTimeMs).toBeGreaterThanOrEqual(4.5);
    expect(metrics.drawCallsCount).toBe(12);
    expect(metrics.trianglesCount).toBe(24);
    expect(metrics.renderQueueLength).toBe(5);
  });

  it("should query allocated GPU buffers and textures count from GPU manager", () => {
    const gpu = new GPUResourceManager();
    const monitor = new RenderMonitoringService(gpu);

    // Allocate 1 mock texture (100x100 -> 40000 bytes) and 1 mock buffer (64 bytes)
    gpu.getOrCreateTexture("tex1", 100, 100);
    gpu.getOrCreateBuffer("buf1", 64);

    monitor.beginFrame();
    monitor.endFrame(1, 2, 0);

    const metrics = monitor.getMetrics();
    expect(metrics.gpuMemoryBytes).toBe(40064);
    expect(metrics.textureUsageCount).toBe(1);
  });
});
