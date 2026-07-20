export type ShaderEffectType =
  | "Glow"
  | "Bloom"
  | "Blur"
  | "Refraction"
  | "Heat distortion"
  | "Electricity"
  | "Chromatic aberration"
  | "Animated gradients";

export interface ShaderUniforms {
  timeMs: number;
  resolution: [number, number];
  intensity: number;
}

export class ShaderLibrary {
  private activeShader: ShaderEffectType = "Glow";

  public selectShader(type: ShaderEffectType): void {
    this.activeShader = type;
  }

  /**
   * Compiles WebGL GLSL fragment source strings mapping presets.
   */
  public getGLSLSource(): string {
    switch (this.activeShader) {
      case "Bloom":
        return `
          precision mediump float;
          uniform float u_intensity;
          varying vec2 v_texCoord;
          void main() {
            gl_FragColor = vec4(1.0, 0.9, 0.6, 1.0) * u_intensity;
          }
        `;
      case "Electricity":
        return `
          precision mediump float;
          uniform float u_time;
          varying vec2 v_texCoord;
          void main() {
            float noise = sin(v_texCoord.x * 20.0 + u_time);
            gl_FragColor = vec4(0.3, 0.8, 1.0, noise);
          }
        `;
      default:
        return `
          precision mediump float;
          uniform float u_intensity;
          varying vec2 v_texCoord;
          void main() {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0) * u_intensity;
          }
        `;
    }
  }

  public getActiveShader(): ShaderEffectType {
    return this.activeShader;
  }
}
