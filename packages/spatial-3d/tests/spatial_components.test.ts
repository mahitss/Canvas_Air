import { describe, it, expect } from "vitest";
import { DefaultSpatialDeviceProvider, SpatialDeviceRegistry } from "../src/adapters/provider_framework";
import { SpatialSessionManager } from "../src/sessions/session_manager";
import { CoordinateEngine } from "../src/math/coordinate_engine";
import { SpatialAnchorManager } from "../src/anchors/anchor_manager";

describe("Spatial Computing & Mixed Reality Platform", () => {
  it("should initialize device providers and manage registries", async () => {
    const provider = new DefaultSpatialDeviceProvider();
    const registry = new SpatialDeviceRegistry();

    registry.register(provider);
    expect(registry.getActiveProvider()?.id).toBe("default-webxr-provider");

    expect(await provider.health()).toBe("down");
    await provider.initialize();
    await provider.connect();
    expect(await provider.health()).toBe("healthy");
  });

  it("should create multi-user spatial sessions and track status", async () => {
    const manager = new SpatialSessionManager();

    const mockMeta = {
      sessionId: "session-777",
      name: "Mixed Reality Meeting",
      creatorId: "user-1",
      participantIds: ["user-1", "user-2"],
      createdAt: Date.now(),
      status: "active" as const
    };

    const id = await manager.createSession(mockMeta);
    expect(id).toBe("session-777");

    await manager.suspendSession(id);
    expect(manager.getSessionMetadata(id)?.status).toBe("suspended");
  });

  it("should translate local coordinate points to world and calibrate origin offsets", () => {
    const engine = new CoordinateEngine();

    const origin = { x: 10, y: 20, z: 30, precision: 0.01 };
    const local = { x: 1, y: 2, z: 3, precision: 0.01 };

    const world = engine.toWorldCoordinates(local, origin);
    expect(world.x).toBe(11);
    expect(world.y).toBe(22);
    expect(world.z).toBe(33);

    const backLocal = engine.toLocalCoordinates(world, origin);
    expect(backLocal.x).toBe(1);

    const calibrated = engine.calibrate(origin, { x: 5, y: 5, z: 5, precision: 0.01 });
    expect(calibrated.x).toBe(15);
  });

  it("should manage persistent anchors and anchors relocations", async () => {
    const manager = new SpatialAnchorManager();

    const anchor = {
      id: "anch-1",
      name: "Virtual Whiteboard Center",
      position: { x: 1, y: 1, z: 1 },
      orientation: { x: 0, y: 0, z: 0 },
      createdAt: Date.now()
    };

    const metadata = {
      anchorId: "anch-1",
      persistent: true,
      shared: true,
      notes: "Main board anchor reference"
    };

    await manager.createAnchor(anchor, metadata);
    expect(manager.getAnchorMetadata("anch-1")?.shared).toBe(true);

    await manager.relocateAnchor("anch-1", { x: 2, y: 2, z: 2 });
    expect(manager.getAnchor("anch-1")?.position.x).toBe(2);
  });
});
