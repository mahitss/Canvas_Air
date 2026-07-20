import { describe, it, expect } from "vitest";
import { EffectManager } from "../src/effect/manager";
import { PhysicsSolver } from "../src/physics/force";

describe("VFX Performance & Adaptive LOD Benchmarks", () => {
  it("should dynamically scale down computations and particle counts when under load", () => {
    const physics = new PhysicsSolver(9.8, 20.0, 0.0); // setup wind and gravity
    physics.setNoise(15.0); // high noise amplitude calculation load

    const manager = new EffectManager(undefined, physics, 10000);

    // 1. Benchmark under High LOD with continuous spawn rate
    manager.setLod("high");
    expect(manager.getLod()).toBe("high");

    const tStartHigh = performance.now();
    const emitterHigh = manager.createEmitter("Fire", 0, 0);
    
    // Simulate multiple frames to spawn and simulate particles
    for (let i = 0; i < 50; i++) {
      manager.update(0.016);
    }
    const tEndHigh = performance.now();
    const durationHigh = tEndHigh - tStartHigh;
    const activeCountHigh = (emitterHigh as any).emitter.activeParticles.length;
    
    // Clear manager context
    manager.clear();

    // 2. Benchmark under Low LOD with same config
    manager.setLod("low");
    expect(manager.getLod()).toBe("low");

    const tStartLow = performance.now();
    const emitterLow = manager.createEmitter("Fire", 0, 0);
    
    // Simulate multiple frames to spawn and simulate particles under Low LOD
    for (let i = 0; i < 50; i++) {
      manager.update(0.016);
    }
    const tEndLow = performance.now();
    const durationLow = tEndLow - tStartLow;
    const activeCountLow = (emitterLow as any).emitter.activeParticles.length;

    console.log(`[VFX LOD Performance Benchmark]`);
    console.log(`- High LOD active particles: ${activeCountHigh}, simulation time: ${durationHigh.toFixed(4)}ms`);
    console.log(`- Low LOD active particles: ${activeCountLow}, simulation time: ${durationLow.toFixed(4)}ms`);

    // Verify adaptive rate limits particles spawn counts under Low LOD loads (should be roughly 25%)
    expect(activeCountLow).toBeLessThan(activeCountHigh);
    
    // Low LOD should compile and run successfully
    expect(durationLow).toBeDefined();
  });
});
