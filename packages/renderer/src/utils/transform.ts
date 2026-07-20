import { Matrix3 } from "../types";

/**
 * Matrix 2D Transform utilities supporting identity, translate, rotate, scale,
 * skew, matrix multiplication, inversion, and point project coordinates mapping.
 * Optimized with optional target outputs parameter to eliminate memory allocations.
 */
export class TransformEngine {
  /**
   * Returns an identity matrix. Reuses target matrix if supplied.
   */
  public static identity(out?: Matrix3): Matrix3 {
    const res = out || ([0, 0, 0, 0, 0, 0, 0, 0, 0] as unknown as Matrix3);
    res[0] = 1; res[1] = 0; res[2] = 0;
    res[3] = 0; res[4] = 1; res[5] = 0;
    res[6] = 0; res[7] = 0; res[8] = 1;
    return res;
  }

  /**
   * Returns a translation matrix. Reuses target matrix if supplied.
   */
  public static translate(tx: number, ty: number, out?: Matrix3): Matrix3 {
    const res = out || ([0, 0, 0, 0, 0, 0, 0, 0, 0] as unknown as Matrix3);
    res[0] = 1; res[1] = 0; res[2] = tx;
    res[3] = 0; res[4] = 1; res[5] = ty;
    res[6] = 0; res[7] = 0; res[8] = 1;
    return res;
  }

  /**
   * Returns a scaling matrix. Reuses target matrix if supplied.
   */
  public static scale(sx: number, sy: number, out?: Matrix3): Matrix3 {
    const res = out || ([0, 0, 0, 0, 0, 0, 0, 0, 0] as unknown as Matrix3);
    res[0] = sx; res[1] = 0;  res[2] = 0;
    res[3] = 0;  res[4] = sy; res[5] = 0;
    res[6] = 0;  res[7] = 0;  res[8] = 1;
    return res;
  }

  /**
   * Returns a rotation matrix (degrees). Reuses target matrix if supplied.
   */
  public static rotate(degrees: number, out?: Matrix3): Matrix3 {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const res = out || ([0, 0, 0, 0, 0, 0, 0, 0, 0] as unknown as Matrix3);
    res[0] = cos; res[1] = -sin; res[2] = 0;
    res[3] = sin; res[4] = cos;  res[5] = 0;
    res[6] = 0;   res[7] = 0;    res[8] = 1;
    return res;
  }

  /**
   * Returns a skew/shear matrix (angles in degrees). Reuses target matrix if supplied.
   */
  public static skew(skewXDeg: number, skewYDeg: number, out?: Matrix3): Matrix3 {
    const radX = (skewXDeg * Math.PI) / 180;
    const radY = (skewYDeg * Math.PI) / 180;
    const tanX = Math.tan(radX);
    const tanY = Math.tan(radY);
    const res = out || ([0, 0, 0, 0, 0, 0, 0, 0, 0] as unknown as Matrix3);
    res[0] = 1;    res[1] = tanX; res[2] = 0;
    res[3] = tanY; res[4] = 1;    res[5] = 0;
    res[6] = 0;    res[7] = 0;    res[8] = 1;
    return res;
  }

  /**
   * Multiplies matrix A by matrix B (A x B). Reuses target matrix if supplied.
   */
  public static multiply(a: Matrix3, b: Matrix3, out?: Matrix3): Matrix3 {
    const a00 = a[0], a01 = a[1], a02 = a[2];
    const a10 = a[3], a11 = a[4], a12 = a[5];
    const a20 = a[6], a21 = a[7], a22 = a[8];

    const b00 = b[0], b01 = b[1], b02 = b[2];
    const b10 = b[3], b11 = b[4], b12 = b[5];
    const b20 = b[6], b21 = b[7], b22 = b[8];

    const res = out || ([0, 0, 0, 0, 0, 0, 0, 0, 0] as unknown as Matrix3);
    res[0] = a00 * b00 + a01 * b10 + a02 * b20;
    res[1] = a00 * b01 + a01 * b11 + a02 * b21;
    res[2] = a00 * b02 + a01 * b12 + a02 * b22;
    
    res[3] = a10 * b00 + a11 * b10 + a12 * b20;
    res[4] = a10 * b01 + a11 * b11 + a12 * b21;
    res[5] = a10 * b02 + a11 * b12 + a12 * b22;
    
    res[6] = a20 * b00 + a21 * b10 + a22 * b20;
    res[7] = a20 * b01 + a21 * b11 + a22 * b21;
    res[8] = a20 * b02 + a21 * b12 + a22 * b22;

    return res;
  }

  /**
   * Computes the analytical 3x3 inverse matrix. Reuses target matrix if supplied.
   */
  public static invert(m: Matrix3, out?: Matrix3): Matrix3 {
    const m00 = m[0], m01 = m[1], m02 = m[2];
    const m10 = m[3], m11 = m[4], m12 = m[5];
    const m20 = m[6], m21 = m[7], m22 = m[8];

    // Compute determinant
    const det =
      m00 * (m11 * m22 - m12 * m21) -
      m01 * (m10 * m22 - m12 * m20) +
      m02 * (m10 * m21 - m11 * m20);

    if (Math.abs(det) < 1e-8) {
      throw new Error("[TransformEngineError] Determinant is zero; matrix cannot be inverted.");
    }

    const invDet = 1.0 / det;
    const res = out || ([0, 0, 0, 0, 0, 0, 0, 0, 0] as unknown as Matrix3);

    res[0] = (m11 * m22 - m12 * m21) * invDet;
    res[1] = (m02 * m21 - m01 * m22) * invDet;
    res[2] = (m01 * m12 - m02 * m11) * invDet;
    res[3] = (m12 * m20 - m10 * m22) * invDet;
    res[4] = (m00 * m22 - m02 * m20) * invDet;
    res[5] = (m02 * m10 - m00 * m12) * invDet;
    res[6] = (m10 * m21 - m11 * m20) * invDet;
    res[7] = (m01 * m20 - m00 * m21) * invDet;
    res[8] = (m00 * m11 - m01 * m10) * invDet;

    return res;
  }

  /**
   * Projects a point into matrix space.
   */
  public static transformPoint(m: Matrix3, x: number, y: number): { x: number; y: number } {
    return {
      x: m[0] * x + m[1] * y + m[2],
      y: m[3] * x + m[4] * y + m[5]
    };
  }
}
