import { Matrix4, Vector3 } from "../types";

export class MatrixMath {
  public static createIdentity(): Matrix4 {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  /**
   * Multiplies two 4x4 matrices in column-major layout.
   */
  public static multiply(a: Matrix4, b: Matrix4): Matrix4 {
    const out = new Float32Array(16);
    
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let i = 0; i < 4; i++) {
          const aIndex = row + i * 4;
          const bIndex = i + col * 4;
          const aVal = a[aIndex];
          const bVal = b[bIndex];
          if (aVal !== undefined && bVal !== undefined) {
            sum += aVal * bVal;
          }
        }
        out[row + col * 4] = sum;
      }
    }

    return out;
  }

  public static translate(m: Matrix4, x: number, y: number, z: number): Matrix4 {
    const translation = this.createIdentity();
    translation[12] = x;
    translation[13] = y;
    translation[14] = z;
    return this.multiply(m, translation);
  }

  public static scale(m: Matrix4, sx: number, sy: number, sz: number): Matrix4 {
    const scale = this.createIdentity();
    scale[0] = sx;
    scale[5] = sy;
    scale[10] = sz;
    return this.multiply(m, scale);
  }

  public static transformVector(m: Matrix4, v: Vector3): Vector3 {
    const x = v.x;
    const y = v.y;
    const z = v.z;
    const w = 1.0;

    const m0 = m[0] ?? 0;
    const m4 = m[4] ?? 0;
    const m8 = m[8] ?? 0;
    const m12 = m[12] ?? 0;

    const m1 = m[1] ?? 0;
    const m5 = m[5] ?? 0;
    const m9 = m[9] ?? 0;
    const m13 = m[13] ?? 0;

    const m2 = m[2] ?? 0;
    const m6 = m[6] ?? 0;
    const m10 = m[10] ?? 0;
    const m14 = m[14] ?? 0;

    const tx = m0 * x + m4 * y + m8 * z + m12 * w;
    const ty = m1 * x + m5 * y + m9 * z + m13 * w;
    const tz = m2 * x + m6 * y + m10 * z + m14 * w;

    return { x: tx, y: ty, z: tz };
  }
}
