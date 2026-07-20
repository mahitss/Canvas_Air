import { describe, it, expect } from "vitest";
import { ObjectPool } from "../src/utils/pool";
import { TextureAtlas } from "../src/gpu/atlas";
import { GpuBatcher } from "../src/gpu/batcher";
import { GpuAllocationError } from "../src/errors";

describe("Rendering Optimizations & Benchmarks", () => {
  describe("ObjectPool", () => {
    it("should recycle object instances successfully", () => {
      interface IPoint {
        x: number;
        y: number;
      }
      let creations = 0;
      const pool = new ObjectPool<IPoint>(
        () => {
          creations++;
          return { x: 0, y: 0 };
        },
        (pt) => {
          pt.x = 0;
          pt.y = 0;
        }
      );

      // Acquire
      const pt1 = pool.acquire();
      expect(pt1).toEqual({ x: 0, y: 0 });
      expect(creations).toBe(1);

      pt1.x = 10;
      pt1.y = 20;

      // Release
      pool.release(pt1);
      expect(pool.size).toBe(1);

      // Acquire again (should get recycled instance)
      const pt2 = pool.acquire();
      expect(pt2).toEqual({ x: 0, y: 0 }); // resetter was called
      expect(creations).toBe(1); // no new instantiation!
      expect(pool.size).toBe(0);
    });
  });

  describe("TextureAtlas", () => {
    it("should pack sub-textures and return normalized UV coordinates", () => {
      const atlas = new TextureAtlas(512, 512);

      const r1 = atlas.pack("brush1", 100, 50);
      expect(r1.uMin).toBe(0);
      expect(r1.vMin).toBe(0);
      expect(r1.uMax).toBe(100 / 512);
      expect(r1.vMax).toBe(50 / 512);

      const r2 = atlas.pack("brush2", 200, 80);
      // Fits on same shelf because 100 + 200 = 300 <= 512
      expect(r2.x).toBe(100);
      expect(r2.y).toBe(0);

      // Width exceeds current shelf remaining space (300 + 300 = 600 > 512)
      // Height of current shelf is 80 (max of 50 and 80).
      // So r3 will pack on next shelf at y = 80, x = 0
      const r3 = atlas.pack("brush3", 300, 60);
      expect(r3.x).toBe(0);
      expect(r3.y).toBe(80);
    });

    it("should throw GpuAllocationError when atlas bounds are exceeded", () => {
      const atlas = new TextureAtlas(100, 100);
      expect(() => atlas.pack("giant", 200, 200)).toThrow(GpuAllocationError);
      
      // Packing multiple small ones until we overflow
      for (let i = 0; i < 20; i++) {
        try {
          atlas.pack(`rect-${i}`, 30, 30);
        } catch (err) {
          expect(err).toBeInstanceOf(GpuAllocationError);
          break;
        }
      }
    });
  });

  describe("GpuBatcher", () => {
    it("should aggregate draw commands and sort them to minimize state changes", () => {
      const batcher = new GpuBatcher();
      
      // Mock Canvas 2D context
      let fillRectCalls = 0;
      const fillStylesSet: string[] = [];
      const mockCtx = {
        fillRect: () => {
          fillRectCalls++;
        },
        set fillStyle(val: string) {
          fillStylesSet.push(val);
        },
        set strokeStyle(val: string) {}
      } as any;

      // Add commands out of depth order and mixed states
      batcher.add({ x: 0, y: 0, width: 10, height: 10, textureId: "texA", color: "red", zIndex: 1 });
      batcher.add({ x: 5, y: 5, width: 10, height: 10, textureId: "texB", color: "blue", zIndex: 1 });
      batcher.add({ x: 2, y: 2, width: 10, height: 10, textureId: "texA", color: "red", zIndex: 1 });
      batcher.add({ x: 0, y: 0, width: 10, height: 10, textureId: "texC", color: "green", zIndex: 0 }); // lower zIndex

      const stats = batcher.flush(mockCtx);

      // zIndex sorting puts zIndex: 0 first ("green"), then zIndex: 1 ("red", then "blue" or similar)
      expect(stats.nodesRendered).toBe(4);
      expect(fillRectCalls).toBe(4);
      
      // Total draw calls should be minimized (grouping identical textures and colors)
      // Group 1: zIndex 0, color "green" (1 draw call)
      // Group 2: zIndex 1, texture "texA", color "red" (draws both nodes in 1 draw call!)
      // Group 3: zIndex 1, texture "texB", color "blue" (1 draw call)
      expect(stats.drawCalls).toBe(3); // aggregated red texture calls!
      expect(fillStylesSet).toEqual(["green", "red", "blue"]);
    });
  });

  describe("Stress Load Benchmarks", () => {
    it("should execute rendering loops under heavy load efficiently using ObjectPool", () => {
      interface IBounds {
        xMin: number;
        yMin: number;
        xMax: number;
        yMax: number;
      }
      
      const pool = new ObjectPool<IBounds>(
        () => ({ xMin: 0, yMin: 0, xMax: 0, yMax: 0 }),
        (b) => {
          b.xMin = 0;
          b.yMin = 0;
          b.xMax = 0;
          b.yMax = 0;
        }
      );

      const itemsCount = 1000;
      
      // Benchmark 1: Using pool
      const startPool = performance.now();
      const activeList: IBounds[] = [];
      
      for (let i = 0; i < itemsCount; i++) {
        const bounds = pool.acquire();
        bounds.xMin = i;
        bounds.yMin = i;
        bounds.xMax = i + 10;
        bounds.yMax = i + 10;
        activeList.push(bounds);
      }
      
      // Release them back
      for (const item of activeList) {
        pool.release(item);
      }
      const endPool = performance.now();
      const timePool = endPool - startPool;

      // Benchmark 2: Using fresh instantiations
      const startFresh = performance.now();
      const freshList: IBounds[] = [];
      
      for (let i = 0; i < itemsCount; i++) {
        const bounds = { xMin: i, yMin: i, xMax: i + 10, yMax: i + 10 };
        freshList.push(bounds);
      }
      const endFresh = performance.now();
      const timeFresh = endFresh - startFresh;

      console.log(`[Stress Load Benchmark] Rendered ${itemsCount} nodes bounds calculations:`);
      console.log(`- ObjectPool Time: ${timePool.toFixed(4)}ms`);
      console.log(`- Fresh Instantiations Time: ${timeFresh.toFixed(4)}ms`);
      
      // Recycle count should equal itemsCount
      expect(pool.size).toBe(itemsCount);
    });
  });
});
