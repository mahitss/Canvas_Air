export type GpuApiType = "webgl" | "webgpu" | "canvas2d";

export interface IGpuDevice {
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  getApiType(): GpuApiType;
  createBuffer(type: "vertex" | "index", sizeBytes: number, data?: ArrayBufferLike): any;
  createTexture(width: number, height: number, data?: ArrayBufferView): any;
  bindBuffer(buffer: any): void;
  bindTexture(texture: any): void;
  deleteBuffer(buffer: any): void;
  deleteTexture(texture: any): void;
}

/**
 * GpuDevice implements a cross-platform context abstraction over WebGPU, WebGL,
 * and a canvas 2d fallback mode for client machines without graphics acceleration support.
 */
export class GpuDevice implements IGpuDevice {
  private apiType: GpuApiType = "canvas2d";
  private gl: WebGLRenderingContext | null = null;

  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    // 1. Try WebGPU Context
    if (typeof navigator !== "undefined" && (navigator as any).gpu) {
      try {
        const gpu = (navigator as any).gpu;
        const adapter = await gpu.requestAdapter();
        if (adapter) {
          await adapter.requestDevice();
          this.apiType = "webgpu";
          return;
        }
      } catch (err) {
        // Fallback silently to WebGL
      }
    }

    // 2. Try WebGL Context
    if (typeof canvas.getContext === "function") {
      try {
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (gl) {
          this.gl = gl as WebGLRenderingContext;
          this.apiType = "webgl";
          return;
        }
      } catch (err) {
        // Fallback silently to Canvas2D
      }
    }

    // 3. Fallback to Canvas 2D Context
    this.apiType = "canvas2d";
  }

  public getApiType(): GpuApiType {
    return this.apiType;
  }

  public createBuffer(type: "vertex" | "index", sizeBytes: number, data?: ArrayBufferLike): any {
    if (this.apiType === "webgpu") {
      return {
        type: "webgpu-buffer",
        usage: type,
        size: sizeBytes,
        gpuBuffer: { label: `buffer-${type}` }
      };
    } else if (this.apiType === "webgl" && this.gl) {
      const gl = this.gl;
      const buffer = gl.createBuffer();
      const target = type === "vertex" ? gl.ARRAY_BUFFER : gl.ELEMENT_ARRAY_BUFFER;
      gl.bindBuffer(target, buffer);
      if (data) {
        gl.bufferData(target, data, gl.STATIC_DRAW);
      }
      return { type: "webgl-buffer", target, glBuffer: buffer };
    } else {
      return { type: "fallback-buffer", size: sizeBytes, data: data ? new Uint8Array(data) : new Uint8Array(sizeBytes) };
    }
  }

  public createTexture(width: number, height: number, data?: ArrayBufferView): any {
    const byteSize = width * height * 4;
    if (this.apiType === "webgpu") {
      return {
        type: "webgpu-texture",
        width,
        height,
        gpuTexture: { label: "texture-rgba" }
      };
    } else if (this.apiType === "webgl" && this.gl) {
      const gl = this.gl;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA,
        gl.UNSIGNED_BYTE, data ? (data as any) : null
      );
      return { type: "webgl-texture", glTexture: texture };
    } else {
      return { type: "fallback-texture", width, height, data: data ? new Uint8Array(data.buffer) : new Uint8Array(byteSize) };
    }
  }

  public bindBuffer(buffer: any): void {
    if (this.apiType === "webgl" && this.gl && buffer?.type === "webgl-buffer") {
      this.gl.bindBuffer(buffer.target, buffer.glBuffer);
    }
  }

  public bindTexture(texture: any): void {
    if (this.apiType === "webgl" && this.gl && texture?.type === "webgl-texture") {
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture.glTexture);
    }
  }

  public deleteBuffer(buffer: any): void {
    if (this.apiType === "webgl" && this.gl && buffer?.type === "webgl-buffer") {
      this.gl.deleteBuffer(buffer.glBuffer);
    }
  }

  public deleteTexture(texture: any): void {
    if (this.apiType === "webgl" && this.gl && texture?.type === "webgl-texture") {
      this.gl.deleteTexture(texture.glTexture);
    }
  }
}
