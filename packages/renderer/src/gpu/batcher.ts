export interface IBatchCommand {
  x: number;
  y: number;
  width: number;
  height: number;
  textureId: string;
  zIndex: number;
  color: string;
}

export interface IBatchStats {
  drawCalls: number;
  nodesRendered: number;
}

/**
 * GpuBatcher aggregates draw commands, groups them by zIndex and texture target,
 * and flushes them in batched execution blocks to minimize context state changes.
 */
export class GpuBatcher {
  private queue: IBatchCommand[] = [];

  /**
   * Adds a node command to the draw queue.
   */
  public add(command: IBatchCommand): void {
    this.queue.push(command);
  }

  /**
   * Processes all queued draw commands in batches.
   * Minimizes drawing context switches by grouping by texture/color states.
   */
  public flush(ctx: CanvasRenderingContext2D): IBatchStats {
    if (this.queue.length === 0) {
      return { drawCalls: 0, nodesRendered: 0 };
    }

    // Sort by zIndex first (to maintain depth ordering), then by texture ID
    this.queue.sort((a, b) => {
      if (a.zIndex !== b.zIndex) {
        return a.zIndex - b.zIndex;
      }
      return a.textureId.localeCompare(b.textureId);
    });

    let drawCalls = 0;
    let nodesRendered = 0;
    let currentTextureId: string | null = null;
    let currentColor: string | null = null;

    for (const cmd of this.queue) {
      // If the texture or color changed, we flush state and trigger a new virtual draw call
      if (cmd.textureId !== currentTextureId || cmd.color !== currentColor) {
        currentTextureId = cmd.textureId;
        currentColor = cmd.color;
        
        ctx.fillStyle = cmd.color;
        ctx.strokeStyle = cmd.color;
        drawCalls++;
      }

      // Execute mock drawing commands representing vertex stream draw
      ctx.fillRect(cmd.x, cmd.y, cmd.width, cmd.height);
      nodesRendered++;
    }

    // Reset the command queue
    this.queue = [];

    return {
      drawCalls,
      nodesRendered
    };
  }

  /**
   * Retrieves the current number of queued commands.
   */
  public get queueLength(): number {
    return this.queue.length;
  }
}
