export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  angle?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
  type?: string;
  glow?: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  type: string;
  life: number;
  maxLife: number;
  angle: number;
  rotationSpeed: number;
}

export interface Impact {
  id: string;
  x: number;
  y: number;
  color: string;
  type: string;
  life: number;
  maxLife: number;
  radius: number;
}

// 1. GPU-friendly High-Quality Object-Pooled Particle Engine (Zero Allocations in Loop)
export class ParticleEngine {
  private pool: Particle[] = [];
  private activeParticles: Particle[] = [];
  private maxParticles = 1500; // Controlled limit for high-quality readable VFX

  constructor() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: "#ffffff",
        size: 0,
        alpha: 0,
        life: 0,
        maxLife: 0
      });
    }
  }

  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    size: number,
    maxLife: number,
    type = "dust",
    extra: Partial<Particle> = {}
  ) {
    if (this.pool.length === 0) return;
    const p = this.pool.pop()!;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.color = color;
    p.size = size;
    p.alpha = 1.0;
    p.life = maxLife;
    p.maxLife = maxLife;
    p.type = type;
    
    delete p.angle;
    delete p.orbitRadius;
    delete p.orbitSpeed;
    p.glow = true;

    if (extra.angle !== undefined) p.angle = extra.angle;
    if (extra.orbitRadius !== undefined) p.orbitRadius = extra.orbitRadius;
    if (extra.orbitSpeed !== undefined) p.orbitSpeed = extra.orbitSpeed;
    if (extra.glow !== undefined) p.glow = extra.glow;

    this.activeParticles.push(p);
  }

  update(dt: number) {
    const dead: Particle[] = [];
    
    for (let i = 0; i < this.activeParticles.length; i++) {
      const p = this.activeParticles[i]!;
      p.life -= dt * 1000;
      
      if (p.life <= 0) {
        dead.push(p);
        continue;
      }

      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.type === "orbit" && p.angle !== undefined && p.orbitRadius !== undefined && p.orbitSpeed !== undefined) {
        p.angle += p.orbitSpeed * dt;
        p.x += p.vx;
        p.y += p.vy;
      } else if (p.type === "spiral" && p.angle !== undefined && p.orbitRadius !== undefined) {
        p.angle += 4.5 * dt;
        p.orbitRadius = Math.max(2, p.orbitRadius - 100 * dt);
        const cx = p.vx;
        const cy = p.vy;
        p.x = cx + Math.cos(p.angle) * p.orbitRadius;
        p.y = cy + Math.sin(p.angle) * p.orbitRadius;
      } else {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
    }

    for (let i = 0; i < dead.length; i++) {
      const p = dead[i]!;
      const idx = this.activeParticles.indexOf(p);
      if (idx !== -1) {
        this.activeParticles.splice(idx, 1);
        this.pool.push(p);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < this.activeParticles.length; i++) {
      const p = this.activeParticles[i]!;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;

      if (p.glow) {
        ctx.shadowBlur = p.size * 2.0;
        ctx.shadowColor = p.color;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  clear() {
    while (this.activeParticles.length > 0) {
      this.pool.push(this.activeParticles.pop()!);
    }
  }

  getActiveCount(): number {
    return this.activeParticles.length;
  }
}

// 2. STATE 1: SUMMON - Sequential Fingertip Ignition & Energy Bridge Engine
export class FingertipBridgeRenderer {
  static FINGER_COLORS = {
    thumb: "#ef4444",  // Red
    index: "#3b82f6",  // Blue
    middle: "#a855f7", // Purple
    ring: "#eab308",   // Gold
    pinky: "#22c55e"   // Green
  };

  static renderBridges(
    ctx: CanvasRenderingContext2D,
    leftLandmarks: any[] | null,
    rightLandmarks: any[] | null,
    centerCore: { x: number; y: number },
    engine: ParticleEngine,
    width: number,
    height: number,
    chargeLevel: number,
    summonProgress: number // 0.0 to 1.0 (sequential ignition over 500ms)
  ) {
    if (!leftLandmarks || !rightLandmarks) return;

    const fingerIndices = [
      { name: "thumb" as const, idx: 4, color: FingertipBridgeRenderer.FINGER_COLORS.thumb, ignitionThreshold: 0.1 },
      { name: "index" as const, idx: 8, color: FingertipBridgeRenderer.FINGER_COLORS.index, ignitionThreshold: 0.3 },
      { name: "middle" as const, idx: 12, color: FingertipBridgeRenderer.FINGER_COLORS.middle, ignitionThreshold: 0.5 },
      { name: "ring" as const, idx: 16, color: FingertipBridgeRenderer.FINGER_COLORS.ring, ignitionThreshold: 0.7 },
      { name: "pinky" as const, idx: 20, color: FingertipBridgeRenderer.FINGER_COLORS.pinky, ignitionThreshold: 0.9 }
    ];

    const time = performance.now() * 0.003;

    fingerIndices.forEach((finger) => {
      // Sequential Ignition: Finger ignites only when summonProgress reaches its threshold
      if (summonProgress < finger.ignitionThreshold) return;

      const leftLm = leftLandmarks[finger.idx];
      const rightLm = rightLandmarks[finger.idx];

      if (!leftLm || !rightLm) return;

      const p1 = { x: leftLm.x * width, y: leftLm.y * height };
      const p2 = { x: rightLm.x * width, y: rightLm.y * height };

      // 1. Draw glowing ignited fingertip energy spheres
      [p1, p2].forEach((pt) => {
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = finger.color;
        ctx.fillStyle = finger.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 2. Draw stable energy bridge cable connecting matching ignited fingertips
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.shadowBlur = 20;
      ctx.shadowColor = finger.color;
      ctx.strokeStyle = finger.color;
      ctx.lineWidth = 3.0 + Math.sin(time * 5 + finger.idx) * 0.8;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      const steps = 10;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const perpX = -dy / (dist || 1);
        const perpY = dx / (dist || 1);
        const offset = Math.sin(t * Math.PI * 3 + time * 8) * (5 + chargeLevel * 6);

        const interpX = p1.x + dx * t + perpX * offset;
        const interpY = p1.y + dy * t + perpY * offset;
        ctx.lineTo(interpX, interpY);
      }

      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Inner white high-density electric core line
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // 3. Energy visibly flows along each cable toward the central core
      if (Math.random() < 0.5) {
        const sourcePt = Math.random() < 0.5 ? p1 : p2;
        const t = Math.random();
        const startX = sourcePt.x + (centerCore.x - sourcePt.x) * t;
        const startY = sourcePt.y + (centerCore.y - sourcePt.y) * t;

        const vx = (centerCore.x - startX) * 0.09;
        const vy = (centerCore.y - startY) * 0.09;

        engine.spawn(startX, startY, vx, vy, finger.color, 2.0 + Math.random() * 1.5, 350 + Math.random() * 150, "dust");
      }
    });
  }
}

// 3. Base Class for Elemental Heroes (Movie-Quality VFX Specifications)
export abstract class Hero {
  abstract name: string;
  abstract icon: string;
  abstract palette: string[];
  abstract baseColor: string;

  abstract playSummon(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, dt: number, handDistance?: number): void;
  abstract playImpact(engine: ParticleEngine, x: number, y: number): void;
}

// 🌌 GALAXY HERO (Movie-Quality Cosmic Nebula & Universe Formation)
export class GalaxyHero extends Hero {
  name = "Galaxy";
  icon = "🌌";
  palette = ["#a855f7", "#6366f1", "#06b6d4", "#ffffff"];
  baseColor = "#6366f1";

  private tAngle = 0;

  playSummon(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, dt: number, handDistance: number = 120) {
    this.tAngle += dt * (2.0 + charge * 3.5);

    // 1. Ambient Radial Light Aura (Building Tension)
    const coreRadius = Math.max(15, Math.min(95, (handDistance * 0.25) + charge * 35));
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.shadowBlur = coreRadius * 2.8;
    ctx.shadowColor = "#a855f7";

    const grad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, coreRadius * 1.6);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.35, "#06b6d4");
    grad.addColorStop(0.7, "#6366f1");
    grad.addColorStop(1.0, "transparent");
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center.x, center.y, coreRadius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // 2. Cosmic Light Rays & Lens Flare Flare Spikes at 100% Charge
    if (charge >= 0.85) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.0;
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#06b6d4";

      const spikeLen = coreRadius * 1.8;
      ctx.beginPath();
      ctx.moveTo(center.x - spikeLen, center.y);
      ctx.lineTo(center.x + spikeLen, center.y);
      ctx.moveTo(center.x, center.y - spikeLen);
      ctx.lineTo(center.x, center.y + spikeLen);
      ctx.stroke();
    }
    
    ctx.restore();

    // 3. High-Quality Spiraling Star Streams & Cosmic Nebula Dust
    if (Math.random() < 0.75) {
      const startAngle = Math.random() * Math.PI * 2;
      const radius = Math.min(200, handDistance * 0.5 + Math.random() * 40);
      const px = center.x + Math.cos(startAngle) * radius;
      const py = center.y + Math.sin(startAngle) * radius;
      const color = this.palette[Math.floor(Math.random() * this.palette.length)]!;
      
      engine.spawn(px, py, center.x, center.y, color, 2.0 + Math.random() * 2.0, 500 + Math.random() * 300, "spiral", {
        angle: startAngle,
        orbitRadius: radius
      });
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 90; i++) {
      const angle = (i / 90) * Math.PI * 2;
      const speed = 4.0 + Math.random() * 7.5;
      const color = this.palette[Math.floor(Math.random() * this.palette.length)]!;
      engine.spawn(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        3.0 + Math.random() * 3.5,
        1000 + Math.random() * 600
      );
    }
  }
}

// ⚡ LIGHTNING HERO
export class LightningHero extends Hero {
  name = "Lightning";
  icon = "⚡";
  palette = ["#00f3ff", "#ffeb3b", "#ffffff"];
  baseColor = "#00f3ff";

  playSummon(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    ctx.save();
    ctx.strokeStyle = "#00f3ff";
    ctx.lineWidth = 2.0 + charge * 3.0;
    ctx.shadowBlur = 16 + charge * 16;
    ctx.shadowColor = "#00f3ff";

    const drawJaggedArc = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const steps = 6;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const cx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 30 * charge;
        const cy = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 30 * charge;
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    const halfDist = Math.min(110, handDistance / 2);
    if (Math.random() < 0.8) {
      drawJaggedArc(center.x - halfDist, center.y, center.x + halfDist, center.y);
      drawJaggedArc(center.x, center.y - halfDist, center.x, center.y + halfDist);
    }

    if (Math.random() < 0.7) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * (halfDist + 20) * charge;
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * radius;
      engine.spawn(px, py, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, "#ffeb3b", 2.2, 250 + Math.random() * 250);
    }

    ctx.restore();
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 75; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5.0 + Math.random() * 9.0;
      engine.spawn(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() < 0.4 ? "#ffeb3b" : "#00f3ff",
        2.5 + Math.random() * 3.0,
        350 + Math.random() * 250
      );
    }
  }
}

// 🔥 FIRE HERO
export class FireHero extends Hero {
  name = "Fire";
  icon = "🔥";
  palette = ["#ff3d00", "#ff9100", "#ffea00", "#ffffff"];
  baseColor = "#ff3d00";

  playSummon(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    const spawnRate = Math.floor(4 + charge * 6);
    for (let i = 0; i < spawnRate; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(130, handDistance * 0.4 + Math.random() * 30);
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + 40 - Math.random() * 80;
      
      const vx = -Math.sin(angle) * (2.5 + charge * 4.0);
      const vy = -4.0 - charge * 5.5;
      const color = this.palette[Math.floor(Math.random() * 3)]!;

      engine.spawn(px, py, vx, vy, color, 3.0 + Math.random() * 3.5, 450 + Math.random() * 250);
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 7.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 2.0;
      const color = this.palette[Math.floor(Math.random() * this.palette.length)]!;
      
      engine.spawn(x, y, vx, vy, color, 3.5 + Math.random() * 4.0, 750 + Math.random() * 450);
    }
  }
}

// ❄ ICE HERO
export class IceHero extends Hero {
  name = "Ice";
  icon = "❄";
  palette = ["#a5f3fc", "#e0f2fe", "#ffffff"];
  baseColor = "#a5f3fc";

  playSummon(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    ctx.save();
    ctx.strokeStyle = "rgba(165, 243, 252, 0.8)";
    ctx.lineWidth = 2.0 + charge * 3.0;
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#a5f3fc";
    ctx.beginPath();
    
    const sides = 6;
    const r = Math.max(15, Math.min(85, handDistance * 0.35 + charge * 25));
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const px = center.x + Math.cos(angle) * r;
      const py = center.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    if (Math.random() < 0.6) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(100, handDistance * 0.4);
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * radius;
      engine.spawn(px, py, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, "#a5f3fc", 2.2 + Math.random() * 2.0, 700, "dust");
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 65; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.0;
      engine.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() < 0.4 ? "#ffffff" : "#a5f3fc", 3.0 + Math.random() * 3.0, 900 + Math.random() * 350);
    }
  }
}

// 🌊 WATER HERO
export class WaterHero extends Hero {
  name = "Water";
  icon = "🌊";
  palette = ["#0ea5e9", "#3b82f6", "#ffffff"];
  baseColor = "#3b82f6";

  playSummon(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    const radius = Math.max(18, Math.min(90, handDistance * 0.38 + charge * 28));
    ctx.save();
    ctx.strokeStyle = "rgba(14, 165, 233, 0.7)";
    ctx.lineWidth = 2.5 + charge * 3.5;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#3b82f6";
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (Math.random() < 0.7) {
      const angle = Math.random() * Math.PI * 2;
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * radius;
      engine.spawn(px, py, -Math.sin(angle) * 2.0, Math.cos(angle) * 2.0, "#3b82f6", 2.5 + Math.random() * 2.0, 550);
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 6.5;
      engine.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed + 0.8, "#0ea5e9", 3.0 + Math.random() * 3.0, 800 + Math.random() * 300);
    }
  }
}

// 🌪 WIND HERO
export class WindHero extends Hero {
  name = "Wind";
  icon = "🌪";
  palette = ["#94a3b8", "#cbd5e1", "#e2e8f0"];
  baseColor = "#cbd5e1";

  playSummon(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    const count = Math.floor(3 + charge * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(120, handDistance * 0.45);
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * radius;
      engine.spawn(px, py, -Math.sin(angle) * (4.0 + charge * 5.0), Math.cos(angle) * (4.0 + charge * 5.0), "#e2e8f0", 1.8 + Math.random() * 1.5, 350 + Math.random() * 150, "dust", { glow: false });
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const speed = 4.5 + Math.random() * 7.5;
      engine.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, "#cbd5e1", 1.8 + Math.random() * 2.0, 500 + Math.random() * 250, "dust", { glow: false });
    }
  }
}

// ☀️ SOLAR HERO
export class SolarHero extends Hero {
  name = "Solar";
  icon = "☀️";
  palette = ["#eab308", "#f97316", "#ffffff"];
  baseColor = "#eab308";

  playSummon(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.shadowBlur = 20 + charge * 35;
    ctx.shadowColor = "#f97316";

    const r = Math.max(18, Math.min(95, handDistance * 0.38 + charge * 35));
    const grad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.4, "#eab308");
    grad.addColorStop(0.8, "#f97316");
    grad.addColorStop(1.0, "transparent");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (Math.random() < 0.65) {
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * (2.5 + charge * 4.5);
      const vy = Math.sin(angle) * (2.5 + charge * 4.5);
      engine.spawn(center.x, center.y, vx, vy, "#f97316", 2.8, 350 + Math.random() * 350);
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 75; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * 8.5;
      engine.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() < 0.4 ? "#ffffff" : "#f97316", 3.5 + Math.random() * 3.5, 800 + Math.random() * 350);
    }
  }
}

// 🌙 LUNAR HERO
export class LunarHero extends Hero {
  name = "Lunar";
  icon = "🌙";
  palette = ["#38bdf8", "#94a3b8", "#e2e8f0"];
  baseColor = "#38bdf8";

  playSummon(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
    ctx.lineWidth = 2.5 + charge * 3.5;
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#38bdf8";

    ctx.beginPath();
    const r = Math.max(18, Math.min(85, handDistance * 0.38 + charge * 28));
    ctx.arc(center.x, center.y, r, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.restore();

    if (Math.random() < 0.6) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 30;
      const px = center.x + Math.cos(angle) * dist;
      const py = center.y + Math.sin(angle) * dist;
      engine.spawn(px, py, -Math.sin(angle) * 1.5, Math.cos(angle) * 1.5, "#e2e8f0", 2.2, 600);
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 6.5;
      engine.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() < 0.5 ? "#38bdf8" : "#e2e8f0", 2.5 + Math.random() * 2.5, 900 + Math.random() * 300);
    }
  }
}

// 💎 CRYSTAL HERO
export class CrystalHero extends Hero {
  name = "Crystal";
  icon = "💎";
  palette = ["#f43f5e", "#d946ef", "#ffffff"];
  baseColor = "#f43f5e";

  playSummon(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    ctx.save();
    ctx.strokeStyle = "rgba(217, 70, 239, 0.85)";
    ctx.lineWidth = 2.0 + charge * 2.5;
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#d946ef";

    const drawDiamond = (cx: number, cy: number, w: number, h: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h);
      ctx.lineTo(cx + w, cy);
      ctx.lineTo(cx, cy + h);
      ctx.lineTo(cx - w, cy);
      ctx.closePath();
      ctx.stroke();
    };

    const dw = Math.max(12, Math.min(70, handDistance * 0.28 + charge * 22));
    const dh = Math.max(16, Math.min(95, handDistance * 0.38 + charge * 30));
    drawDiamond(center.x, center.y, dw, dh);
    ctx.restore();

    if (Math.random() < 0.7) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 30;
      engine.spawn(center.x + Math.cos(angle) * dist, center.y + Math.sin(angle) * dist, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, "#ffffff", 2.8, 450);
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 75; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 7.0;
      engine.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() < 0.4 ? "#d946ef" : "#f43f5e", 3.0 + Math.random() * 3.0, 950 + Math.random() * 350);
    }
  }
}

// 4. STATE 2: UNLEASH - Kinetic Launch & Shockwave Manager
export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private impacts: Impact[] = [];
  private flashAlpha = 0.0;
  private shockwaveRadius = 0;

  launch(x: number, y: number, vx: number, vy: number, color: string, type: string) {
    const angle = Math.atan2(vy, vx);
    this.flashAlpha = 0.85; // Bright flash bloom on unleash
    this.shockwaveRadius = 10;

    this.projectiles.push({
      id: Math.random().toString(),
      x,
      y,
      vx,
      vy,
      color,
      size: 28,
      type,
      life: 2500,
      maxLife: 2500,
      angle,
      rotationSpeed: type === "galaxy" ? 6.5 : 2.5
    });
  }

  update(dt: number, width: number, height: number, engine: ParticleEngine, activeHero: Hero) {
    const deadProjs: Projectile[] = [];
    const deadImpacts: Impact[] = [];

    // Fade flash bloom cleanly
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.5);
    }

    if (this.shockwaveRadius > 0 && this.shockwaveRadius < Math.max(width, height)) {
      this.shockwaveRadius += dt * 350;
    }

    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i]!;
      p.life -= dt * 1000;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.angle += p.rotationSpeed * dt;

      // High-speed energy trail
      if (Math.random() < 0.85) {
        const backAngle = p.angle + Math.PI + (Math.random() - 0.5) * 0.4;
        const trailVx = Math.cos(backAngle) * 3.0 - p.vx * 0.1;
        const trailVy = Math.sin(backAngle) * 3.0 - p.vy * 0.1;
        engine.spawn(p.x, p.y, trailVx, trailVy, p.color, 4.0 + Math.random() * 2.5, 450 + Math.random() * 250);
      }

      const offscreen = p.x < -60 || p.x > width + 60 || p.y < -60 || p.y > height + 60;
      if (p.life <= 0 || offscreen) {
        deadProjs.push(p);
        if (!offscreen) {
          this.triggerImpact(p.x, p.y, p.color, p.type, activeHero, engine);
        }
      }
    }

    for (let i = 0; i < this.impacts.length; i++) {
      const imp = this.impacts[i]!;
      imp.life -= dt * 1000;
      imp.radius += 140 * dt;
      if (imp.life <= 0) {
        deadImpacts.push(imp);
      }
    }

    this.projectiles = this.projectiles.filter((p) => !deadProjs.includes(p));
    this.impacts = this.impacts.filter((imp) => !deadImpacts.includes(imp));
  }

  private triggerImpact(x: number, y: number, color: string, type: string, hero: Hero, engine: ParticleEngine) {
    this.impacts.push({
      id: Math.random().toString(),
      x,
      y,
      color,
      type,
      life: 600,
      maxLife: 600,
      radius: 8
    });

    hero.playImpact(engine, x, y);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 1. Flash Bloom & Shockwave on Unleash
    if (this.flashAlpha > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    if (this.shockwaveRadius > 10 && this.shockwaveRadius < Math.max(ctx.canvas.width, ctx.canvas.height)) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, this.shockwaveRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. High-Speed Projectiles
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i]!;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      ctx.shadowBlur = p.size * 2.8;
      ctx.shadowColor = p.color;

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.5, p.color);
      grad.addColorStop(1.0, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 3. Impact Shockwaves
    for (let i = 0; i < this.impacts.length; i++) {
      const imp = this.impacts[i]!;
      const opacity = Math.max(0, imp.life / imp.maxLife);
      ctx.strokeStyle = imp.color;
      ctx.lineWidth = 4.5 * opacity;
      ctx.globalAlpha = opacity;
      ctx.shadowBlur = 18;
      ctx.shadowColor = imp.color;

      ctx.beginPath();
      ctx.arc(imp.x, imp.y, imp.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  clear() {
    this.projectiles = [];
    this.impacts = [];
    this.flashAlpha = 0;
    this.shockwaveRadius = 0;
  }
}
