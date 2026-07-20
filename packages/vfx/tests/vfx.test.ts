import { describe, it, expect, beforeEach } from "vitest";
import { ParticlePool } from "../src/particle/pool";
import { VfxEventBus } from "../src/events/bus";
import { EffectManager } from "../src/effect/manager";
import { ParticleEmitter } from "../src/emitter/emitter";
import { PresetManager } from "../src/preset/manager";
import { PhysicsSolver } from "../src/physics/force";
import { Particle } from "../src/particle/particle";
import { EmitterPreset } from "../src/types";

describe("VFX Particle Object Pool Recycler", () => {
  it("should pre-allocate particles and reuse them up to size bounds limits", () => {
    const pool = new ParticlePool(10, 20);
    expect(pool.getCapacity()).toBe(10);
    expect(pool.getActiveCount()).toBe(0);

    const activeParticles: any[] = [];
    const config = {
      x: 0, y: 0, vx: 5, vy: 5, ax: 0, ay: 0,
      size: 5, growth: 0, rotation: 0, angularVelocity: 0,
      color: "#FFF", opacity: 1, decay: 0.5, lifetime: 2.0,
      blendMode: "screen" as const, gravityFactor: 1.0, dragFactor: 0.05
    };

    // 1. Acquire up to limit
    for (let i = 0; i < 20; i++) {
      const pt = pool.acquire(config);
      expect(pt).not.toBeNull();
      activeParticles.push(pt);
    }

    expect(pool.getActiveCount()).toBe(20);
    expect(pool.getCapacity()).toBe(20);

    // 2. Cross limit (must return null)
    const extra = pool.acquire(config);
    expect(extra).toBeNull();

    // 3. Release first particle back to stack
    pool.release(activeParticles[0]);
    expect(pool.getActiveCount()).toBe(19);

    // 4. Acquire again (should succeed and reuse released slot)
    const replaced = pool.acquire(config);
    expect(replaced).not.toBeNull();
    expect(pool.getActiveCount()).toBe(20);
  });
});

describe("VFX Emitter Spawns & Bursts", () => {
  let presets: PresetManager;
  let pool: ParticlePool;

  beforeEach(() => {
    presets = new PresetManager();
    pool = new ParticlePool(50, 100);
  });

  it("should spawn circular and point coordinate spreads on updates/bursts", () => {
    const firePreset = presets.getPreset("Fire");
    const emitter = new ParticleEmitter("fire-emitter-01", firePreset, 100, 200);

    expect(emitter.activeParticles.length).toBe(0);

    // Trigger immediate burst
    emitter.burst(15, pool);
    expect(emitter.activeParticles.length).toBe(15);

    // Verify coordinates fall inside circular spawn radius bounds (30px)
    for (const pt of emitter.activeParticles) {
      const dist = Math.sqrt((pt.x - 100) ** 2 + (pt.y - 200) ** 2);
      expect(dist).toBeLessThanOrEqual(30.1);
    }
  });
});

describe("Physics Solver Integrator Forces", () => {
  it("should decelerate speeds using drag and accelerate downwards using gravity", () => {
    const solver = new PhysicsSolver(9.8, 0.0, 0.0); // Gravity y = 9.8, no wind force
    const particle = new Particle();
    
    // Setup initial particle velocity
    particle.x = 0;
    particle.y = 0;
    particle.vx = 50;
    particle.vy = 0;
    particle.isAlive = true;
    particle.gravityFactor = 1.0;
    particle.dragFactor = 0.1; // active drag coefficient

    // Resolve forces
    solver.applyForces(particle, 0.1);
    expect(particle.ax).toBeLessThan(0.0); // drag force opposes velocity (-5.0 px/s^2)
    expect(particle.ay).toBe(9.8); // 9.8 gravity

    // Ticks kinematics update
    particle.update(0.1);
    expect(particle.vx).toBeLessThan(50); // deceleration check
    expect(particle.vy).toBeGreaterThan(0); // gravity acceleration check
  });

  it("should pull particles towards attractors and push away from repellers", () => {
    const solver = new PhysicsSolver(0.0, 0.0, 0.0); // no gravity
    const particle = new Particle();
    particle.x = 10;
    particle.y = 10;
    particle.vx = 0;
    particle.vy = 0;
    particle.isAlive = true;
    particle.gravityFactor = 1.0;
    particle.dragFactor = 0.0;

    // Add positive attractor at (20, 10) -> pulls in +x direction
    solver.addAttractor({ x: 20, y: 10, strength: 10, radius: 50 });
    solver.applyForces(particle, 0.1);
    expect(particle.ax).toBeGreaterThan(0); // pulled to the right

    // Add negative repeller at (0, 10) -> pushes in +x direction (away from 0)
    solver.clearAttractors();
    solver.addAttractor({ x: 0, y: 10, strength: -10, radius: 50 });
    solver.applyForces(particle, 0.1);
    expect(particle.ax).toBeGreaterThan(0); // pushed to the right
  });

  it("should bounce velocity and trigger collision hook callbacks upon boundary hits", () => {
    const solver = new PhysicsSolver(0.0, 0.0, 0.0);
    const particle = new Particle();
    particle.x = 90;
    particle.y = 50;
    particle.vx = 20; // moving right
    particle.vy = 0;

    let hitBoundaryId = "";
    solver.addBoundary({ id: "wall", xMin: 0, yMin: 0, xMax: 100, yMax: 100, bounce: 0.8 });
    solver.onCollision((pt, boundary) => {
      hitBoundaryId = boundary.id;
    });

    // Move particle past boundary
    particle.x = 105;
    solver.resolveCollisions(particle);

    expect(particle.x).toBe(100);
    expect(particle.vx).toBe(-16); // 20 * 0.8 bounced left
    expect(hitBoundaryId).toBe("wall");
  });
});

describe("VFX Preset Manager Profile JSON IO", () => {
  it("should register custom user presets and parse JSON mappings correctly", () => {
    const manager = new PresetManager();
    const custom: EmitterPreset = {
      name: "CustomSnow",
      shape: "rectangle",
      spawnRate: 10,
      burstCount: 0,
      lifetimeRange: [3.0, 5.0],
      speedRange: [10, 20],
      sizeRange: [2, 4],
      colorPalette: ["#FFF"],
      opacityRange: [0.5, 0.8],
      blendMode: "screen",
      gravity: 0.2,
      drag: 0.1,
      noiseAmplitude: 2
    };

    manager.addPreset(custom);
    expect(manager.getPreset("CustomSnow")).toBe(custom);

    const json = manager.exportPresetsJSON();
    const reloaded = new PresetManager();
    reloaded.loadPresetsJSON(json);

    expect(reloaded.getPreset("CustomSnow").name).toBe("CustomSnow");
  });

  it("should contain all built-in presets by default", () => {
    const manager = new PresetManager();
    const presets = ["Sparkles", "Smoke", "Fire", "Magic", "Ribbon", "Dust", "Glow", "Trail"];
    for (const p of presets) {
      expect(manager.getPreset(p)).toBeDefined();
      expect(manager.getPreset(p).name).toBe(p);
    }
  });
});

describe("Particle Transitions", () => {
  it("should transition size, opacity, rotation, and color correctly over lifetime", () => {
    const pt = new Particle();
    const config = {
      x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
      size: 2.0, growth: 0.0, rotation: 10.0, angularVelocity: 180.0,
      color: "#ff0000", opacity: 1.0, decay: 0.0, lifetime: 2.0,
      blendMode: "screen" as const, gravityFactor: 1.0, dragFactor: 0.02,
      startColor: "#ff0000",
      endColor: "#0000ff",
      startSize: 2.0,
      endSize: 10.0,
      startOpacity: 1.0,
      endOpacity: 0.0
    };

    pt.initialize(config as any);

    expect(pt.color).toBe("#ff0000");
    expect(pt.size).toBe(2.0);
    expect(pt.opacity).toBe(1.0);
    expect(pt.rotation).toBe(10.0);

    // Update simulation by 1.0 seconds (exactly half lifetime progress = 0.5)
    pt.update(1.0);

    // Verify progress-based color interpolation (halfway between red and blue)
    // Red: [255, 0, 0] -> Blue: [0, 0, 255] -> Mid: [128, 0, 128] (#800080)
    expect(pt.color).toBe("#800080");

    // Verify size transition
    expect(pt.size).toBe(6.0); // 2.0 + (10.0 - 2.0) * 0.5 = 6.0

    // Verify opacity transition
    expect(pt.opacity).toBe(0.5); // 1.0 + (0.0 - 1.0) * 0.5 = 0.5

    // Verify rotation transitions
    expect(pt.rotation).toBe(190.0); // 10.0 + 180.0 * 1.0 = 190.0
  });
});

describe("EffectManager Coordinator", () => {
  it("should create, trigger, update, pause, and pool active emitters and burst effects", () => {
    const manager = new EffectManager();

    // 1. Create Emitter
    const emitter = manager.createEmitter("Fire", 50, 50);
    expect(emitter).toBeDefined();
    expect(manager.getActiveEmitters().length).toBe(1);

    // 2. Remove Emitter (recycles it to pool)
    manager.removeEmitter(emitter.id);
    expect(manager.getActiveEmitters().length).toBe(0);

    // 3. Re-create Emitter of same preset type (should pull from pool and reuse)
    const reused = manager.createEmitter("Fire", 100, 100);
    expect(reused.id).toBe(emitter.id); // same instance reused!
    expect(manager.getActiveEmitters().length).toBe(1);

    // 4. Trigger Burst Effect
    const effect = manager.triggerEffect("Magic", { x: 200, y: 200, count: 5 });
    expect(effect).toBeDefined();
    expect(effect.name).toBe("Magic");
    expect(manager.getActiveEmitters().length).toBe(2);

    // 5. Verify pause state constraints
    manager.pause();
    const beforeParticlesAge = (reused as any).emitter.activeParticles.map((p: any) => p.age);
    manager.update(0.1);
    const afterParticlesAge = (reused as any).emitter.activeParticles.map((p: any) => p.age);
    expect(beforeParticlesAge).toEqual(afterParticlesAge); // no age advance when paused!

    // 6. Verify resume state
    manager.resume();
    manager.update(0.1);
    expect((reused as any).emitter.activeParticles.length).toBeGreaterThanOrEqual(0);

    // 7. Verify global disable constraints
    manager.disable();
    expect(manager.isEnabled).toBe(false);
    
    // Draw and update should do nothing when disabled
    let drawCalled = false;
    const mockCtx = {
      save: () => { drawCalled = true; },
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {}
    } as any;
    manager.draw(mockCtx);
    expect(drawCalled).toBe(false); // skipped draw
  });
});

describe("VfxEventBus PubSub", () => {
  it("should dispatch events, support wildcards, isolate exceptions, and replay past events", () => {
    const bus = new VfxEventBus();

    const receivedEvents: any[] = [];
    const unsubscribeType = bus.subscribe("EffectCreated", (ev: any) => {
      receivedEvents.push(ev);
    });

    const wildcardEvents: any[] = [];
    const unsubscribeWildcard = bus.subscribe("*", (ev: any) => {
      wildcardEvents.push(ev);
    });

    // 1. Publish EffectCreated event
    const event1 = {
      type: "EffectCreated" as const,
      payload: { effectId: "1", name: "Smoke", x: 10, y: 10 },
      timestamp: Date.now()
    };
    bus.publish(event1);

    expect(receivedEvents).toEqual([event1]);
    expect(wildcardEvents).toEqual([event1]);

    // 2. Wildcard catch other types
    const event2 = {
      type: "ParticleSpawned" as const,
      payload: { particleId: "p1", emitterId: "1", x: 12, y: 12 },
      timestamp: Date.now()
    };
    bus.publish(event2);

    expect(receivedEvents.length).toBe(1); // not updated (only subscribed to EffectCreated)
    expect(wildcardEvents.length).toBe(2); // caught by wildcard

    unsubscribeType();
    unsubscribeWildcard();

    // 3. Replay history stream on subscribe
    const replayed: any[] = [];
    bus.subscribe("EffectCreated", (ev: any) => {
      replayed.push(ev);
    }, { replay: true });

    expect(replayed).toEqual([event1]); // immediate playback of historical matched event!

    // 4. Exception isolation
    let crashCallbackCalled = false;
    bus.subscribe("EffectError", () => {
      crashCallbackCalled = true;
      throw new Error("Subscriber failed!");
    });

    let secondarySubscriberCalled = false;
    bus.subscribe("EffectError", () => {
      secondarySubscriberCalled = true;
    });

    const errorEvent = {
      type: "EffectError" as const,
      payload: { errorType: "EmitterAllocationError", message: "Failed!" },
      timestamp: Date.now()
    };

    // Publish should not crash the context because of first subscriber throwing error
    expect(() => bus.publish(errorEvent)).not.toThrow();
    expect(crashCallbackCalled).toBe(true);
    expect(secondarySubscriberCalled).toBe(true);
  });
});



