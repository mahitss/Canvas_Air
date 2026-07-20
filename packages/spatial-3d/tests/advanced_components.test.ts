import { describe, it, expect, vi } from "vitest";
import { SpatialMappingEngine } from "../src/mapping/mapping_engine";
import { DepthManager } from "../src/depth/depth_manager";
import { ExtendedInteractionEngine } from "../src/interaction/interaction_engine";
import { WorldStateManager } from "../src/world/world_state";
import { SpatialSyncEngine } from "../src/sync/sync_engine";
import { SpatialEventBus } from "../src/events/event_bus";
import { SpatialOptimizer } from "../src/debug/optimizations";
import { SceneNode3D, SpatialAnchor } from "../src/types";

describe("Spatial Computing Advanced Components", () => {
  it("should map planes and check depth occlusion & collisions", () => {
    const mapper = new SpatialMappingEngine();
    mapper.updateSurface({ id: "surf-1", type: "plane", vertices: [{ x: 0, y: 0, z: 0 }] });
    expect(mapper.getSurfaces().length).toBe(1);

    const depth = new DepthManager();
    depth.updateDepthFrame({
      id: "depth-1",
      width: 2,
      height: 2,
      depthBuffer: new Float32Array([1.5, 2.0, 2.5, 3.0]),
      confidenceBuffer: new Float32Array([0.9, 0.9, 0.9, 0.9])
    });

    const est = depth.estimateDistance(1, 0); // x=1, y=0 -> index 1
    expect(est.distance).toBe(2.0);
    expect(est.confidence).toBeCloseTo(0.9, 5);

    const occluded = depth.checkOcclusion({ x: 0, y: 0, z: -15 }, new Float32Array(16));
    expect(occluded).toBe(true);

    const collided = depth.checkCollision({ x: 0, y: 0, z: 0 }, 5, [{ x: 2, y: 2, z: 2 }]);
    expect(collided).toBe(true);
  });

  it("should track hover, processes focus and process direct manipulation", () => {
    const engine = new ExtendedInteractionEngine();

    const node: SceneNode3D = {
      id: "n-1",
      name: "3D Sphere",
      type: "mesh",
      localMatrix: new Float32Array(16),
      worldMatrix: new Float32Array(16),
      boundingRadius: 5
    };

    engine.processDirectManipulation({ x: 10, y: 20, z: 30 }, node);
    expect(node.worldMatrix[12]).toBe(10);
    expect(node.worldMatrix[13]).toBe(20);
    expect(node.worldMatrix[14]).toBe(30);

    engine.setFocusedNode("n-1");
    expect(engine.getFocusedNodeId()).toBe("n-1");
  });

  it("should commit world state versions and resolve sync conflicts", () => {
    const world = new WorldStateManager();
    world.updateUserPosition("user-1", { x: 5, y: 5, z: 5 });

    const verId = world.commitVersion([], []);
    expect(verId).toContain("v-");
    expect(world.getHistory().length).toBe(1);

    const sync = new SpatialSyncEngine({ syncIntervalMs: 100, enableOfflineRecovery: true });
    sync.setOnline(false);
    sync.queueOfflineChange("anch-1", "add");
    expect(sync.getOfflineQueue().length).toBe(1);

    sync.setOnline(true);
    expect(sync.getOfflineQueue().length).toBe(0);

    const local: SpatialAnchor = { id: "a", name: "L", position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0 }, createdAt: 1000 };
    const remote: SpatialAnchor = { id: "a", name: "R", position: { x: 1, y: 1, z: 1 }, orientation: { x: 0, y: 0, z: 0 }, createdAt: 2000 };

    const resolved = sync.resolveAnchorConflict(local, remote);
    expect(resolved.name).toBe("R");
  });

  it("should dispatch events via bus and utilize coordinate caches", () => {
    const bus = SpatialEventBus.getInstance();
    bus.clearHistory();

    const handler = vi.fn();
    bus.subscribe("DeviceConnected", handler);

    bus.publish("DeviceConnected", { deviceId: "hmd-1" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.getHistory().length).toBe(1);

    SpatialOptimizer.clearCache();
    expect(SpatialOptimizer.getCachedTransform("key-1")).toBeNull();
    SpatialOptimizer.cacheTransform("key-1", { x: 1, y: 1, z: 1 });
    expect(SpatialOptimizer.getCachedTransform("key-1")?.x).toBe(1);
  });
});
