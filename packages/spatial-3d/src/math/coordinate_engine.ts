import { ICoordinateEngine } from "../interfaces";
import { CoordinatePoint } from "../domain";
import { CoordinateEngineException } from "../errors";

export class CoordinateEngine implements ICoordinateEngine {
  /**
   * Translates local point offsets to world coordinates based on origin positions.
   */
  public toWorldCoordinates(local: CoordinatePoint, origin: CoordinatePoint): CoordinatePoint {
    if (!local || !origin) {
      throw new CoordinateEngineException("Points must be fully defined");
    }

    return {
      x: Number((origin.x + local.x).toFixed(4)),
      y: Number((origin.y + local.y).toFixed(4)),
      z: Number((origin.z + local.z).toFixed(4)),
      precision: Math.min(local.precision, origin.precision)
    };
  }

  /**
   * Translates world coordinates into local point offsets.
   */
  public toLocalCoordinates(world: CoordinatePoint, origin: CoordinatePoint): CoordinatePoint {
    if (!world || !origin) {
      throw new CoordinateEngineException("Points must be fully defined");
    }

    return {
      x: Number((world.x - origin.x).toFixed(4)),
      y: Number((world.y - origin.y).toFixed(4)),
      z: Number((world.z - origin.z).toFixed(4)),
      precision: Math.min(world.precision, origin.precision)
    };
  }

  /**
   * Calibrates coordinate origin offset updates.
   */
  public calibrate(origin: CoordinatePoint, delta: CoordinatePoint): CoordinatePoint {
    if (!origin || !delta) {
      throw new CoordinateEngineException("Points must be fully defined");
    }

    return {
      x: Number((origin.x + delta.x).toFixed(4)),
      y: Number((origin.y + delta.y).toFixed(4)),
      z: Number((origin.z + delta.z).toFixed(4)),
      precision: origin.precision
    };
  }
}
