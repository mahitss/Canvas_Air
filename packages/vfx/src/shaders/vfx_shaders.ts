export interface GLSLShader {
  vertex: string;
  fragment: string;
}

export const VFX_SHADERS: Record<string, GLSLShader> = {
  // 1. Fire Particle shader: dynamic color mapping from flame center
  FireShader: {
    vertex: `
      attribute vec2 aPosition;
      attribute vec4 aColor;
      attribute float aSize;
      varying vec4 vColor;
      varying vec2 vTexCoord;
      uniform mat3 uProjectionMatrix;
      void main() {
        vColor = aColor;
        vTexCoord = aPosition * 0.5 + 0.5;
        vec3 pos = uProjectionMatrix * vec3(aPosition * aSize, 1.0);
        gl_Position = vec4(pos.xy, 0.0, 1.0);
      }
    `,
    fragment: `
      precision mediump float;
      varying vec4 vColor;
      varying vec2 vTexCoord;
      void main() {
        float d = distance(vTexCoord, vec2(0.5, 0.5));
        if (d > 0.5) discard;
        // Flame color ramp: bright core fading to transparent red
        float intensity = smoothstep(0.5, 0.0, d);
        vec3 flameColor = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.9, 0.1), intensity);
        gl_FragColor = vec4(flameColor, vColor.a * intensity);
      }
    `
  },

  // 2. Electric Sparkle shader: sharp radial beams
  ElectricShader: {
    vertex: `
      attribute vec2 aPosition;
      attribute vec4 aColor;
      varying vec4 vColor;
      uniform mat3 uProjectionMatrix;
      void main() {
        vColor = aColor;
        vec3 pos = uProjectionMatrix * vec3(aPosition, 1.0);
        gl_Position = vec4(pos.xy, 0.0, 1.0);
      }
    `,
    fragment: `
      precision mediump float;
      varying vec4 vColor;
      uniform float uTime;
      void main() {
        // High frequency flicker calculation
        float flicker = sin(uTime * 50.0) * 0.2 + 0.8;
        gl_FragColor = vec4(vColor.rgb * flicker, vColor.a);
      }
    `
  },

  // 3. Neon Halo Particle shader: wide blurred gaussian spread
  NeonHaloShader: {
    vertex: `
      attribute vec2 aPosition;
      attribute vec4 aColor;
      varying vec4 vColor;
      varying vec2 vPos;
      void main() {
        vColor = aColor;
        vPos = aPosition;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `,
    fragment: `
      precision mediump float;
      varying vec4 vColor;
      varying vec2 vPos;
      void main() {
        float dist = length(vPos);
        // Exponential neon decay profile
        float alpha = exp(-dist * 4.0);
        gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
      }
    `
  }
};
