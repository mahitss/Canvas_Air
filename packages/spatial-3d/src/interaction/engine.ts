import { Ray3D, SceneNode3D, Vector3 } from "../types";

export class SpatialInteractionEngine {
  /**
   * Resolves intersections between a Ray3D and bounding spheres of nodes,
   * returning intersecting node array sorted by distance ascending.
   */
  public raycast(ray: Ray3D, nodes: SceneNode3D[]): SceneNode3D[] {
    const hits: { node: SceneNode3D; distance: number }[] = [];

    const origin = ray.origin;
    const direction = ray.direction;

    for (const node of nodes) {
      if (node.boundingRadius === undefined) continue;

      // Extract node world translation coordinate centers
      const centerX = node.worldMatrix[12];
      const centerY = node.worldMatrix[13];
      const centerZ = node.worldMatrix[14];

      if (centerX === undefined || centerY === undefined || centerZ === undefined) continue;

      const center: Vector3 = { x: centerX, y: centerY, z: centerZ };
      const radius = node.boundingRadius;

      // Vector from ray origin to sphere center
      const v = {
        x: center.x - origin.x,
        y: center.y - origin.y,
        z: center.z - origin.z
      };

      // Project center onto ray direction
      const projDist = v.x * direction.x + v.y * direction.y + v.z * direction.z;

      // If projected distance is negative, sphere is behind the ray origin
      if (projDist < 0) continue;

      // Calculate perpendicular distance squared
      const vDistSq = v.x * v.x + v.y * v.y + v.z * v.z;
      const perpDistSq = vDistSq - projDist * projDist;

      // If perpendicular distance is greater than radius squared, no hit
      if (perpDistSq > radius * radius) continue;

      // Calculate intersection distance
      const offset = Math.sqrt(radius * radius - perpDistSq);
      const hitDistance = projDist - offset;

      hits.push({
        node,
        distance: hitDistance
      });
    }

    return hits.sort((a, b) => a.distance - b.distance).map(h => h.node);
  }
}
export * from "../types";
export * from "../config";
export * from "../math/matrix";
export * from "../graph/scene";
export * from "../anchors/manager";
export * from "../interaction/engine";
