import { Particle } from "../particle/particle";

export interface IAttractor {
  x: number;
  y: number;
  strength: number; // Positive for attraction, negative for repulsion
  radius: number; // Influence radius
}

export interface ICollisionBox {
  id: string;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  bounce?: number; // bounce/rebound coefficient (default 0.7)
}

export type CollisionHook = (particle: Particle, boundary: ICollisionBox) => void;

export class PhysicsSolver {
  private gravityX: number = 0;
  private gravityY: number = 98.0; // Px per second^2
  
  private windX: number = 0;
  private windY: number = 0;
  
  private noiseAmplitude: number = 0;

  // Attraction / Repulsion fields
  private attractors: IAttractor[] = [];

  // Collision boundary hooks
  private boundaries: ICollisionBox[] = [];
  private collisionHooks: CollisionHook[] = [];

  constructor(gravityY: number = 98.0, windX: number = 0, windY: number = 0) {
    this.gravityY = gravityY;
    this.windX = windX;
    this.windY = windY;
  }

  public setGravity(gx: number, gy: number): void {
    this.gravityX = gx;
    this.gravityY = gy;
  }

  public setWind(wx: number, wy: number): void {
    this.windX = wx;
    this.windY = wy;
  }

  public setNoise(amplitude: number): void {
    this.noiseAmplitude = amplitude;
  }

  // --- Attractor / Repeller Management ---

  public addAttractor(attractor: IAttractor): void {
    this.attractors.push(attractor);
  }

  public getAttractors(): IAttractor[] {
    return [...this.attractors];
  }

  public clearAttractors(): void {
    this.attractors = [];
  }

  // --- Collision Boundaries & Hooks ---

  public addBoundary(box: ICollisionBox): void {
    this.boundaries.push(box);
  }

  public getBoundaries(): ICollisionBox[] {
    return [...this.boundaries];
  }

  public clearBoundaries(): void {
    this.boundaries = [];
  }

  public onCollision(hook: CollisionHook): void {
    this.collisionHooks.push(hook);
  }

  /**
   * Applies cumulative gravity, wind drag, noise, and attraction/repulsion forces onto active particle acceleration.
   */
  public applyForces(particle: Particle, _dt: number, lod: "high" | "medium" | "low" = "high"): void {
    if (lod === "low") {
      // LOD Low: Apply only static gravity forces to save CPU/GPU overhead
      particle.ax = this.gravityX * particle.gravityFactor;
      particle.ay = this.gravityY * particle.gravityFactor;
      return;
    }

    // 1. Gravity and wind vector forces
    let forceX = this.windX + this.gravityX * particle.gravityFactor;
    let forceY = this.gravityY * particle.gravityFactor + this.windY;

    // 2. Drag resistance opposing velocity: F_drag = -C * v
    forceX -= particle.vx * particle.dragFactor;
    forceY -= particle.vy * particle.dragFactor;

    // 3. Pseudo-random noise field simulating air turbulence (High LOD only)
    if (lod === "high" && this.noiseAmplitude > 0) {
      const angle = Math.sin(particle.x * 0.05) * Math.cos(particle.y * 0.05) * Math.PI * 2;
      forceX += Math.cos(angle) * this.noiseAmplitude;
      forceY += Math.sin(angle) * this.noiseAmplitude;
    }

    // 4. Attraction / Repulsion forces (Medium & High LOD)
    for (const attractor of this.attractors) {
      const dx = attractor.x - particle.x;
      const dy = attractor.y - particle.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist < attractor.radius && dist > 0.1) {
        // Linear falloff force magnitude
        const intensity = (attractor.strength * (1.0 - dist / attractor.radius)) / dist;
        forceX += dx * intensity;
        forceY += dy * intensity;
      }
    }

    // Apply accumulated acceleration integration
    particle.ax = forceX;
    particle.ay = forceY;
  }

  /**
   * Resolves collision boundaries checks and triggers registered collision hooks.
   */
  public resolveCollisions(particle: Particle): void {
    for (const boundary of this.boundaries) {
      const bounce = boundary.bounce ?? 0.7;
      let collided = false;

      // Handle simple axis-aligned box constraint collisions
      if (particle.x < boundary.xMin) {
        particle.x = boundary.xMin;
        particle.vx = -particle.vx * bounce;
        collided = true;
      } else if (particle.x > boundary.xMax) {
        particle.x = boundary.xMax;
        particle.vx = -particle.vx * bounce;
        collided = true;
      }

      if (particle.y < boundary.yMin) {
        particle.y = boundary.yMin;
        particle.vy = -particle.vy * bounce;
        collided = true;
      } else if (particle.y > boundary.yMax) {
        particle.y = boundary.yMax;
        particle.vy = -particle.vy * bounce;
        collided = true;
      }

      if (collided) {
        for (const hook of this.collisionHooks) {
          hook(particle, boundary);
        }
      }
    }
  }
}
export * from "../types";
export * from "../config";
