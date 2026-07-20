import { describe, it, expect } from "vitest";
import { TextureAtlas } from "../src/gpu/atlas";
import { GpuBatcher } from "../src/gpu/batcher";
import { VfxRenderIntegrationOrchestrator, IMinimalVfxEffectManager } from "../src/integration/vfx";

describe("VFX Rendering Integration Layer", () => {
  it("should sync active particles, pack colors in atlas, batch draw commands, and recycle resources", () => {
    const atlas = new TextureAtlas(512, 512);
    const batcher = new GpuBatcher();

    // Setup mock VFX EffectManager
    const mockVfxManager: IMinimalVfxEffectManager = {
      getActiveEmitters: () => [
        {
          id: "emitter-1",
          getPreset: () => ({ name: "Magic", blendMode: "lighter" }),
          activeParticles: [
            { x: 10, y: 10, size: 5, color: "#ff0000", opacity: 1.0, blendMode: "screen", rotation: 0 },
            { x: 20, y: 20, size: 6, color: "#ff0000", opacity: 0.8, blendMode: "screen", rotation: 45 },
            { x: 30, y: 30, size: 4, color: "#0000ff", opacity: 0.9, blendMode: "screen", rotation: 90 }
          ]
        }
      ]
    };

    const orchestrator = new VfxRenderIntegrationOrchestrator(atlas, batcher, mockVfxManager);

    // Mock Canvas Rendering Context
    let fillRectCalls = 0;
    const colorsUsed: string[] = [];
    const mockCtx = {
      fillRect: () => {
        fillRectCalls++;
      },
      set fillStyle(val: string) {
        colorsUsed.push(val);
      },
      set strokeStyle(val: string) {}
    } as any;

    expect(orchestrator.poolSize).toBe(0);

    // Trigger render integration pass
    const stats = orchestrator.render(mockCtx);

    // 3 particles rendered
    expect(stats.nodesRendered).toBe(3);
    expect(fillRectCalls).toBe(3);

    // 2 unique colors/textures packed in atlas: #ff0000, #0000ff
    // Should be batched into 2 draw calls instead of 3!
    expect(stats.drawCalls).toBe(2);
    
    // Lexicographically, "#0000ff" comes before "#ff0000"
    expect(colorsUsed).toEqual(["#0000ff", "#ff0000"]);

    // Command commandPool size should now contain 3 recycled objects!
    expect(orchestrator.poolSize).toBe(3);
  });
});
