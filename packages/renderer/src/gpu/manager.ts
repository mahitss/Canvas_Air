import { IGpuManager, IGpuStats } from "../interfaces";
import { GpuDevice } from "./device";

/**
 * GPUResourceManager manages cache storage, allocation limits, and deletes
 * device texture/buffer handles. Integrates with GpuDevice backend layers.
 */
export class GPUResourceManager implements IGpuManager {
  private bufferCache: Map<string, { buffer: any; sizeBytes: number }> = new Map();
  private textureCache: Map<string, { texture: any; width: number; height: number }> = new Map();
  private shaderProgramCache: Map<string, any> = new Map();

  private stats = {
    allocatedBuffersCount: 0,
    allocatedTexturesCount: 0,
    shaderProgramsCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    gpuMemoryUsedBytes: 0
  };

  private device: GpuDevice;

  constructor(device?: GpuDevice) {
    this.device = device || new GpuDevice();
  }

  public getOrCreateBuffer(id: string, sizeBytes: number, data?: Float32Array): any {
    const cached = this.bufferCache.get(id);
    if (cached) {
      this.stats.cacheHits++;
      return cached.buffer;
    }

    this.stats.cacheMisses++;
    
    // Allocate buffer utilizing the device abstraction layers
    const bufferData = data ? data.buffer : undefined;
    const newBuffer = this.device.createBuffer("vertex", sizeBytes, bufferData);
    
    this.bufferCache.set(id, { buffer: newBuffer, sizeBytes });
    this.stats.gpuMemoryUsedBytes += sizeBytes;
    this.stats.allocatedBuffersCount++;
    
    return newBuffer;
  }

  public getOrCreateTexture(id: string, width: number, height: number, data?: Uint8Array): any {
    const cached = this.textureCache.get(id);
    if (cached) {
      this.stats.cacheHits++;
      return cached.texture;
    }

    this.stats.cacheMisses++;

    const newTexture = this.device.createTexture(width, height, data);
    const sizeBytes = width * height * 4;
    
    this.textureCache.set(id, { texture: newTexture, width, height });
    this.stats.gpuMemoryUsedBytes += sizeBytes;
    this.stats.allocatedTexturesCount++;
    
    return newTexture;
  }

  public getOrCreateShader(id: string, _vertexSource: string, _fragmentSource: string): any {
    const cached = this.shaderProgramCache.get(id);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;

    // Mock shader compiling logic (shaders logic is skipped by user request constraints)
    const mockProgram = {
      glProgramId: `program-${Math.random().toString(36).substr(2, 9)}`,
      attributes: ["aPosition", "aTexCoord"],
      uniforms: ["uModelViewMatrix", "uProjectionMatrix", "uOpacity"]
    };

    this.shaderProgramCache.set(id, mockProgram);
    this.stats.shaderProgramsCount++;
    return mockProgram;
  }

  public getOrCreateShaderProgram(id: string, vertexSource: string, fragmentSource: string): any {
    return this.getOrCreateShader(id, vertexSource, fragmentSource);
  }

  public deleteBuffer(id: string): void {
    const cached = this.bufferCache.get(id);
    if (cached) {
      this.device.deleteBuffer(cached.buffer);
      this.stats.gpuMemoryUsedBytes -= cached.sizeBytes;
      this.stats.allocatedBuffersCount--;
      this.bufferCache.delete(id);
    }
  }

  public deleteTexture(id: string): void {
    const cached = this.textureCache.get(id);
    if (cached) {
      this.device.deleteTexture(cached.texture);
      const sizeBytes = cached.width * cached.height * 4;
      this.stats.gpuMemoryUsedBytes -= sizeBytes;
      this.stats.allocatedTexturesCount--;
      this.textureCache.delete(id);
    }
  }

  public deleteResource(id: string): void {
    if (this.bufferCache.has(id)) {
      this.deleteBuffer(id);
    } else if (this.textureCache.has(id)) {
      this.deleteTexture(id);
    } else if (this.shaderProgramCache.has(id)) {
      this.shaderProgramCache.delete(id);
      this.stats.shaderProgramsCount--;
    }
  }

  public getStats(): IGpuStats & { cacheMisses: number } {
    return { ...this.stats };
  }

  public clear(): void {
    // Delete resources on device prior to clearing caches
    for (const cached of this.bufferCache.values()) {
      this.device.deleteBuffer(cached.buffer);
    }
    for (const cached of this.textureCache.values()) {
      this.device.deleteTexture(cached.texture);
    }

    this.bufferCache.clear();
    this.textureCache.clear();
    this.shaderProgramCache.clear();
    this.stats.gpuMemoryUsedBytes = 0;
    this.stats.allocatedBuffersCount = 0;
    this.stats.allocatedTexturesCount = 0;
    this.stats.shaderProgramsCount = 0;
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
  }

  public clearCache(): void {
    this.clear();
  }
}
