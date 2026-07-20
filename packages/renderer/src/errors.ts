/**
 * Base error class for all rendering and graphics pipeline operations.
 */
export class RendererError extends Error {
  constructor(message: string, public readonly code = "RENDERER_GENERIC_FAILURE") {
    super(message);
    this.name = "RendererError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when allocations of VBOs, FBOs, textures, or query buffers on GPU fail.
 */
export class GpuAllocationError extends RendererError {
  constructor(message: string, public readonly requestedBytes?: number) {
    super(message, "GPU_ALLOCATION_FAILURE");
    this.name = "GpuAllocationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when shader program linking or GLSL compiler failures occur.
 */
export class ShaderCompilationError extends RendererError {
  constructor(message: string, public readonly shaderSource?: string) {
    super(message, "SHADER_COMPILATION_FAILURE");
    this.name = "ShaderCompilationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when coordinate calculations or canvas scaling operations encounter invalid bounds.
 */
export class ViewportError extends RendererError {
  constructor(message: string) {
    super(message, "VIEWPORT_INVALID_BOUNDS");
    this.name = "ViewportError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
