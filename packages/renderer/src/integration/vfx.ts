import { TextureAtlas } from "../gpu/atlas";
import { GpuBatcher, IBatchCommand } from "../gpu/batcher";
import { ObjectPool } from "../utils/pool";

export interface IMinimalVfxParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  blendMode: string;
  rotation: number;
}

export interface IMinimalVfxEmitter {
  id: string;
  activeParticles: IMinimalVfxParticle[];
  getPreset(): { name: string; blendMode: string };
}

export interface IMinimalVfxEffectManager {
  getActiveEmitters(): IMinimalVfxEmitter[];
}

/**
 * Clean Architecture integration orchestrator connecting VFX particle systems
 * to backing GPU TextureAtlases and pooled GpuBatcher draw commands.
 */
export class VfxRenderIntegrationOrchestrator {
  private readonly commandPool: ObjectPool<IBatchCommand>;

  constructor(
    private readonly atlas: TextureAtlas,
    private readonly batcher: GpuBatcher,
    private readonly vfxManager: IMinimalVfxEffectManager
  ) {
    this.commandPool = new ObjectPool<IBatchCommand>(
      () => ({ x: 0, y: 0, width: 0, height: 0, textureId: "", zIndex: 0, color: "" }),
      (cmd) => {
        cmd.x = 0;
        cmd.y = 0;
        cmd.width = 0;
        cmd.height = 0;
        cmd.textureId = "";
        cmd.zIndex = 0;
        cmd.color = "";
      }
    );
  }

  /**
   * Fetches active particles, maps them to GPU atlas coordinates, and flushes
   * them through the draw commands batcher using pooled command memory.
   */
  public render(ctx: CanvasRenderingContext2D): { drawCalls: number; nodesRendered: number } {
    const emitters = this.vfxManager.getActiveEmitters();
    const allocatedCommands: IBatchCommand[] = [];

    for (const em of emitters) {
      const particles = em.activeParticles || [];
      
      for (const p of particles) {
        // Pack particle visual properties (represented here by color) into the texture atlas
        this.atlas.pack(p.color, 16, 16);

        // Acquire recycled command object to prevent memory allocations
        const cmd = this.commandPool.acquire();
        
        cmd.x = p.x - p.size / 2;
        cmd.y = p.y - p.size / 2;
        cmd.width = p.size;
        cmd.height = p.size;
        cmd.textureId = `atlas-${p.color}`;
        cmd.zIndex = 100; // Visual effects depth index
        cmd.color = p.color;

        this.batcher.add(cmd);
        allocatedCommands.push(cmd);
      }
    }

    // Flush batch queue in zIndex and texture order to minimize draw calls
    const stats = this.batcher.flush(ctx);

    // Release commands back to pool
    for (const cmd of allocatedCommands) {
      this.commandPool.release(cmd);
    }

    return stats;
  }

  /**
   * Retrieves the current size of the commands pool.
   */
  public get poolSize(): number {
    return this.commandPool.size;
  }
}
