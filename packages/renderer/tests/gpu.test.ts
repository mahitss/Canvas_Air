import { describe, it, expect } from "vitest";
import { GpuDevice } from "../src/gpu/device";
import { GPUResourceManager } from "../src/gpu/manager";

describe("GPU rendering abstraction & resource manager", () => {
  it("should negotiate API context fallback to canvas2d when WebGL/WebGPU are unavailable", async () => {
    const device = new GpuDevice();
    const mockCanvas = {} as any; // mock empty canvas has no getContext function

    await device.initialize(mockCanvas);
    expect(device.getApiType()).toBe("canvas2d");
  });

  it("should initialize WebGL context when requested context is supported by the canvas element", async () => {
    const device = new GpuDevice();
    const mockGlContext = {
      createBuffer: () => ({ id: 1 }),
      createTexture: () => ({ id: 2 }),
      bindBuffer: () => {},
      bindTexture: () => {},
      deleteBuffer: () => {},
      deleteTexture: () => {},
      texParameteri: () => {},
      texImage2D: () => {}
    };

    const mockCanvas = {
      getContext: (type: string) => {
        if (type === "webgl") return mockGlContext;
        return null;
      }
    } as any;

    await device.initialize(mockCanvas);
    expect(device.getApiType()).toBe("webgl");

    const buf = device.createBuffer("vertex", 64);
    expect(buf.type).toBe("webgl-buffer");

    const tex = device.createTexture(100, 100);
    expect(tex.type).toBe("webgl-texture");
  });

  it("should allocate, retrieve cached, and delete resources from the GPU manager", () => {
    const device = new GpuDevice();
    const manager = new GPUResourceManager(device);

    const buffer = manager.getOrCreateBuffer("vbo-cache", 128);
    const cachedBuffer = manager.getOrCreateBuffer("vbo-cache", 128);

    expect(buffer).toBe(cachedBuffer);
    expect(manager.getStats().cacheHits).toBe(1);

    // Memory tracking validation (128 bytes)
    expect(manager.getStats().gpuMemoryUsedBytes).toBe(128);

    // Resource deletion verification
    manager.deleteResource("vbo-cache");
    expect(manager.getStats().gpuMemoryUsedBytes).toBe(0);
    expect(manager.getStats().allocatedBuffersCount).toBe(0);
  });
});
