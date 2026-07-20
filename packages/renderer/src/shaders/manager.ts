import { GPUResourceManager } from "../gpu/manager";
import { ShaderCompilationError } from "../errors";

export interface ShaderSource {
  vertex: string;
  fragment: string;
  version: number;
}

/**
 * ShaderManager handles registering, compiling, validating, caching, versioning,
 * and hot-reloading shaders.
 */
export class ShaderManager {
  private shaderTemplates: Map<string, ShaderSource> = new Map();

  constructor() {
    this.registerShaderTemplates();
  }

  private registerShaderTemplates(): void {
    // 1. Solid Color Shader template
    this.registerShader(
      "SolidColor",
      `
        attribute vec2 aPosition;
        uniform mat3 uModelViewMatrix;
        uniform mat3 uProjectionMatrix;
        void main() {
          vec3 pos = uProjectionMatrix * uModelViewMatrix * vec3(aPosition, 1.0);
          gl_Position = vec4(pos.xy, 0.0, 1.0);
        }
      `,
      `
        precision mediump float;
        uniform vec4 uColor;
        uniform float uOpacity;
        void main() {
          gl_FragColor = vec4(uColor.rgb, uColor.a * uOpacity);
        }
      `
    );

    // 2. Glow shader template
    this.registerShader(
      "Glow",
      `
        attribute vec2 aPosition;
        attribute vec2 aTexCoord;
        varying vec2 vTexCoord;
        uniform mat3 uProjectionMatrix;
        void main() {
          vTexCoord = aTexCoord;
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `,
      `
        precision mediump float;
        varying vec2 vTexCoord;
        uniform vec4 uGlowColor;
        uniform float uRadius;
        void main() {
          float dist = distance(vTexCoord, vec2(0.5, 0.5));
          float intensity = smoothstep(0.5, 0.5 - uRadius, dist);
          gl_FragColor = vec4(uGlowColor.rgb, uGlowColor.a * intensity);
        }
      `
    );

    // 3. Blur shader template
    this.registerShader(
      "GaussianBlur",
      `
        attribute vec2 aPosition;
        attribute vec2 aTexCoord;
        varying vec2 vTexCoord;
        void main() {
          vTexCoord = aTexCoord;
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `,
      `
        precision mediump float;
        varying vec2 vTexCoord;
        uniform sampler2D uTexture;
        uniform vec2 uTextureSize;
        void main() {
          vec2 offset = vec2(1.5) / uTextureSize;
          vec4 color = texture2D(uTexture, vTexCoord) * 0.4;
          color += texture2D(uTexture, vTexCoord + vec2(offset.x, 0.0)) * 0.15;
          color += texture2D(uTexture, vTexCoord - vec2(offset.x, 0.0)) * 0.15;
          color += texture2D(uTexture, vTexCoord + vec2(0.0, offset.y)) * 0.15;
          color += texture2D(uTexture, vTexCoord - vec2(0.0, offset.y)) * 0.15;
          gl_FragColor = color;
        }
      `
    );
  }

  /**
   * Registers a new shader template.
   */
  public registerShader(id: string, vertex: string, fragment: string, version = 1): void {
    this.validateShader(vertex, fragment, id);
    this.shaderTemplates.set(id, { vertex, fragment, version });
  }

  /**
   * Updates an existing shader template, incrementing its version.
   * If a GPUResourceManager is provided, the compiled program is invalidated from the cache.
   */
  public updateShader(id: string, vertex: string, fragment: string, gpuManager?: GPUResourceManager): void {
    this.validateShader(vertex, fragment, id);
    const existing = this.shaderTemplates.get(id);
    const newVersion = existing ? existing.version + 1 : 1;
    this.shaderTemplates.set(id, { vertex, fragment, version: newVersion });

    if (gpuManager) {
      gpuManager.deleteResource(id);
    }
  }

  /**
   * Validates GLSL shader code syntax and structural rules.
   * Throws ShaderCompilationError on syntax violations.
   */
  public validateShader(vertex: string, fragment: string, id?: string): void {
    this.checkBraces(vertex, "Vertex Shader", id);
    this.checkBraces(fragment, "Fragment Shader", id);

    if (!vertex.includes("void main()")) {
      throw new ShaderCompilationError("Vertex Shader is missing 'void main()' entry point.", id);
    }
    if (!fragment.includes("void main()")) {
      throw new ShaderCompilationError("Fragment Shader is missing 'void main()' entry point.", id);
    }

    if (!fragment.includes("precision")) {
      throw new ShaderCompilationError("Fragment Shader is missing precision declaration.", id);
    }
  }

  private checkBraces(source: string, type: string, id?: string): void {
    let braceCount = 0;
    let parenCount = 0;

    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (char === "{") braceCount++;
      if (char === "}") braceCount--;
      if (char === "(") parenCount++;
      if (char === ")") parenCount--;
    }

    if (braceCount !== 0) {
      throw new ShaderCompilationError(`${type} has mismatched curly braces '{}'.`, id);
    }
    if (parenCount !== 0) {
      throw new ShaderCompilationError(`${type} has mismatched parentheses '()'.`, id);
    }
  }

  public getShaderSource(name: string): ShaderSource {
    const template = this.shaderTemplates.get(name);
    if (!template) {
      throw new Error(`Shader template with name '${name}' is not registered.`);
    }
    return template;
  }

  public getCompiledProgram(name: string, gpuManager: GPUResourceManager): any {
    const source = this.getShaderSource(name);
    return gpuManager.getOrCreateShader(name, source.vertex, source.fragment);
  }
}
