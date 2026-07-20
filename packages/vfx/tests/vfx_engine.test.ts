import { describe, it, expect } from "vitest";
import { MotionTrailEngine } from "../src/trail/motion_trail";
import { BrushEngine } from "../src/brush/brush_engine";
import { GpuParticleEngine } from "../src/particle/gpu_particles";
import { BrushPhysicsEngine } from "../src/physics/brush_physics";
import { ShaderLibrary } from "../src/shaders/shader_library";
import { AdaptiveEffectsEngine } from "../src/adaptive/adaptive_engine";
import { MotionReplayEngine } from "../src/replay/replay_engine";
import { PresetManager } from "../src/preset/manager";

describe("VFX & Particles Engine", () => {
  it("should interpolate motion trails and prune expired nodes", async () => {
    const trail = new MotionTrailEngine({ lifetimeMs: 10, width: 5, smoothingFactor: 0.5 });
    trail.addPoint("finger-1", { x: 10, y: 10, z: 0 });
    trail.addPoint("finger-1", { x: 20, y: 20, z: 0 });
    trail.addPoint("finger-1", { x: 30, y: 30, z: 0 });

    const points = trail.getTrail("finger-1");
    expect(points.length).toBe(3);
    expect(points[1]?.x).toBe(15); // smoothed

    // Wait for lifetime expiration
    await new Promise(r => setTimeout(r, 20));
    expect(trail.getTrail("finger-1").length).toBe(0);
  });

  it("should select brush types and register custom presets", () => {
    const brush = new BrushEngine();
    brush.selectBrush("Laser");
    expect(brush.getActiveBrushPreset().color).toBe("#FF1744");

    brush.registerCustomBrush("CosmicPink", {
      type: "Neon",
      color: "#FF007F",
      glowWidth: 15,
      bloomIntensity: 3.0
    });
    brush.selectBrush("CosmicPink" as any);
    expect(brush.getActiveBrushPreset().bloomIntensity).toBe(3.0);
  });

  it("should write active particles directly into memory buffers", () => {
    const engine = new GpuParticleEngine();
    engine.spawnParticles("Energy", 100, { x: 50, y: 50 });

    expect(engine.getActiveCount()).toBe(100);
    expect(engine.getBuffer().length).toBe(600); // 100 * 6

    engine.update(500); // half second decay
    expect(engine.getActiveCount()).toBe(100);
    expect(engine.getBuffer()[5]).toBeCloseTo(0.5, 1);
  });

  it("should scale stroke attributes based on velocity parameters", () => {
    const physics = new BrushPhysicsEngine();
    const resultFast = physics.resolveRenderingModifiers({
      velocity: { x: 500, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      direction: { x: 1, y: 0, z: 0 },
      gestureStrength: 0.8,
      smoothness: 0.9
    });

    const resultSlow = physics.resolveRenderingModifiers({
      velocity: { x: 10, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      direction: { x: 1, y: 0, z: 0 },
      gestureStrength: 0.8,
      smoothness: 0.9
    });

    expect(resultFast.widthMultiplier).toBeLessThan(resultSlow.widthMultiplier);
  });

  it("should load WebGL fragment shaders source strings", () => {
    const shaders = new ShaderLibrary();
    shaders.selectShader("Electricity");
    expect(shaders.getGLSLSource()).toContain("u_time");
  });

  it("should trigger adaptive presets for circles gestures", () => {
    const engine = new AdaptiveEffectsEngine();
    const res = engine.evaluateAdaptiveAction(10, "Circle");

    expect(res.brushToUse).toBe("Galaxy");
    expect(res.particlesToSpawn).toBe("Energy");
    expect(res.spawnCount).toBe(50);
  });

  it("should capture motion timeline and output ghost trails", () => {
    const replay = new MotionReplayEngine();
    replay.startRecording();
    replay.recordFrame({ timestamp: 100, x: 10, y: 10, z: 0, width: 8 });
    replay.recordFrame({ timestamp: 200, x: 20, y: 20, z: 0, width: 8 });

    expect(replay.getRecordedFrames().length).toBe(2);
    expect(replay.generateGhostTrails(1, 1)[0]?.width).toBe(6); // 8 * 0.75
  });

  it("should register styles presets inside preset manager", () => {
    const manager = new PresetManager();
    expect(manager.getPreset("Cyberpunk").colorPalette).toContain("#FF007F");
    expect(manager.getPreset("Matrix").gravity).toBe(2.0);
  });
});
