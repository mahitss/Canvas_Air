import { describe, it, expect } from "vitest";
import { RENDERER_TOKENS } from "../src/di";
import { RendererError, GpuAllocationError, ShaderCompilationError, ViewportError } from "../src/errors";

describe("Graphics & Rendering Engine Architecture and Types", () => {
  it("should assert DI tokens are properly mapped to unique Symbols", () => {
    expect(RENDERER_TOKENS.SceneRenderer).toBe(Symbol.for("ISceneRenderer"));
    expect(RENDERER_TOKENS.FrameScheduler).toBe(Symbol.for("IFrameScheduler"));
    expect(RENDERER_TOKENS.RenderCamera).toBe(Symbol.for("IRenderCamera"));
    expect(RENDERER_TOKENS.LayerManager).toBe(Symbol.for("ILayerManager"));
    expect(RENDERER_TOKENS.GpuManager).toBe(Symbol.for("IGpuManager"));
    expect(RENDERER_TOKENS.ViewportManager).toBe(Symbol.for("IViewportManager"));
    expect(RENDERER_TOKENS.EventBus).toBe(Symbol.for("IRendererEventBus"));
  });

  it("should verify custom renderer exceptions maintain code and prototype inheritance chain properties", () => {
    const genericErr = new RendererError("generic fail");
    expect(genericErr).toBeInstanceOf(RendererError);
    expect(genericErr.code).toBe("RENDERER_GENERIC_FAILURE");

    const gpuErr = new GpuAllocationError("out of cache memory", 1024);
    expect(gpuErr).toBeInstanceOf(RendererError);
    expect(gpuErr).toBeInstanceOf(GpuAllocationError);
    expect(gpuErr.code).toBe("GPU_ALLOCATION_FAILURE");
    expect(gpuErr.requestedBytes).toBe(1024);

    const shaderErr = new ShaderCompilationError("failed compilation", "void main() {}");
    expect(shaderErr).toBeInstanceOf(RendererError);
    expect(shaderErr).toBeInstanceOf(ShaderCompilationError);
    expect(shaderErr.code).toBe("SHADER_COMPILATION_FAILURE");
    expect(shaderErr.shaderSource).toBe("void main() {}");

    const viewErr = new ViewportError("viewport boundary fail");
    expect(viewErr).toBeInstanceOf(RendererError);
    expect(viewErr).toBeInstanceOf(ViewportError);
    expect(viewErr.code).toBe("VIEWPORT_INVALID_BOUNDS");
  });
});
