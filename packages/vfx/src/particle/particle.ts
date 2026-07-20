import { BlendModeType, ParticleConfig } from "../types";

export class Particle {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public ax: number = 0;
  public ay: number = 0;
  
  public size: number = 2.0;
  public growth: number = 0.0;
  public rotation: number = 0.0;
  public angularVelocity: number = 0.0;
  
  public color: string = "#FFFFFF";
  public opacity: number = 1.0;
  public decay: number = 0.5; // Opacity decay per second
  
  public age: number = 0.0;
  public lifetime: number = 1.0; // Seconds
  
  public blendMode: BlendModeType = "screen";
  public gravityFactor: number = 1.0;
  public dragFactor: number = 0.02;

  public isAlive: boolean = false;

  // Transition parameters
  public startColor: string = "#FFFFFF";
  public endColor: string = "#FFFFFF";
  public startSize: number = 2.0;
  public endSize: number = 2.0;
  public startOpacity: number = 1.0;
  public endOpacity: number = 1.0;

  public initialize(config: ParticleConfig): void {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.ax = config.ax;
    this.ay = config.ay;
    this.size = config.size;
    this.growth = config.growth;
    this.rotation = config.rotation;
    this.angularVelocity = config.angularVelocity;
    this.color = config.color;
    this.opacity = config.opacity;
    this.decay = config.decay;
    this.lifetime = config.lifetime;
    this.blendMode = config.blendMode;
    this.gravityFactor = config.gravityFactor;
    this.dragFactor = config.dragFactor;
    
    this.startColor = (config as any).startColor ?? config.color;
    this.endColor = (config as any).endColor ?? config.color;
    this.startSize = (config as any).startSize ?? config.size;
    this.endSize = (config as any).endSize ?? config.size;
    this.startOpacity = (config as any).startOpacity ?? config.opacity;
    this.endOpacity = (config as any).endOpacity ?? Math.max(0.0, config.opacity - config.decay * config.lifetime);

    this.age = 0.0;
    this.isAlive = true;
  }

  /**
   * Updates particle kinematics coordinates state.
   * Returns false when particle reaches its lifetime boundary.
   */
  public update(dt: number): boolean {
    if (!this.isAlive) {
      return false;
    }

    this.age += dt;
    if (this.age >= this.lifetime) {
      this.isAlive = false;
      return false;
    }

    // Kinematics integration
    this.vx += this.ax * dt;
    this.vy += this.ay * dt;
    
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const progress = Math.min(1.0, this.age / this.lifetime);

    // Apply rotation
    this.rotation += this.angularVelocity * dt;

    // Apply color transition interpolation
    this.color = this.interpolateColor(this.startColor, this.endColor, progress);

    // Apply size transitions or fallback to growth formula
    if ((this.startSize !== this.size || this.endSize !== this.size) && this.startSize !== this.endSize) {
      this.size = Math.max(0.1, this.startSize + (this.endSize - this.startSize) * progress);
    } else {
      this.size = Math.max(0.1, this.size + this.growth * dt);
    }

    // Apply opacity transitions or fallback to decay formula
    if ((this.startOpacity !== this.opacity || this.endOpacity !== this.opacity) && this.startOpacity !== this.endOpacity) {
      this.opacity = Math.max(0.0, this.startOpacity + (this.endOpacity - this.startOpacity) * progress);
    } else {
      this.opacity = Math.max(0.0, this.opacity - this.decay * dt);
    }

    return true;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive || this.opacity <= 0.001) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = this.blendMode;
    ctx.globalAlpha = this.opacity;
    
    // Position translation
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    ctx.fillStyle = this.color;
    
    // Draw dot or soft circular glow representing the particle
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private interpolateColor(c1: string, c2: string, progress: number): string {
    const parseHex = (hex: string): [number, number, number] => {
      let h = hex.replace("#", "");
      if (h.length === 3) {
        h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
      }
      const r = parseInt(h.substring(0, 2), 16) || 0;
      const g = parseInt(h.substring(2, 4), 16) || 0;
      const b = parseInt(h.substring(4, 6), 16) || 0;
      return [r, g, b];
    };

    const [r1, g1, b1] = parseHex(c1);
    const [r2, g2, b2] = parseHex(c2);

    const r = Math.round(r1 + (r2 - r1) * progress);
    const g = Math.round(g1 + (g2 - g1) * progress);
    const b = Math.round(b1 + (b2 - b1) * progress);

    const toHex = (val: number) => {
      const hex = Math.max(0, Math.min(255, val)).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}
export * from "../types";
