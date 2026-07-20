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

// 1. GPU-friendly Particle Engine using Object Pooling
export class ParticleEngine {
  private pool: Particle[] = [];
  private activeParticles: Particle[] = [];
  private maxParticles = 2500;

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
        p.angle += extraAngleSpeed(p.color) * dt;
        p.orbitRadius = Math.max(2, p.orbitRadius - 120 * dt);
        const cx = p.vx;
        const cy = p.vy;
        p.x = cx + Math.cos(p.angle) * p.orbitRadius;
        p.y = cy + Math.sin(p.angle) * p.orbitRadius;
      } else {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vx *= 0.97;
        p.vy *= 0.97;
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
        ctx.shadowBlur = p.size * 1.5;
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

function extraAngleSpeed(color: string): number {
  return color.includes("cyan") ? 6.0 : 4.0;
}

// 2. PHASE 1: Fingertip Energy Bridge System (Non-crossing, matching colors)
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
    chargeLevel: number
  ) {
    if (!leftLandmarks || !rightLandmarks) return;

    const fingerIndices = [
      { name: "thumb" as const, idx: 4, color: FingertipBridgeRenderer.FINGER_COLORS.thumb },
      { name: "index" as const, idx: 8, color: FingertipBridgeRenderer.FINGER_COLORS.index },
      { name: "middle" as const, idx: 12, color: FingertipBridgeRenderer.FINGER_COLORS.middle },
      { name: "ring" as const, idx: 16, color: FingertipBridgeRenderer.FINGER_COLORS.ring },
      { name: "pinky" as const, idx: 20, color: FingertipBridgeRenderer.FINGER_COLORS.pinky }
    ];

    const time = performance.now() * 0.003;

    fingerIndices.forEach((finger) => {
      const leftLm = leftLandmarks[finger.idx];
      const rightLm = rightLandmarks[finger.idx];

      if (!leftLm || !rightLm) return;

      const p1 = { x: leftLm.x * width, y: leftLm.y * height };
      const p2 = { x: rightLm.x * width, y: rightLm.y * height };

      // 1. Draw glowing fingertip energy spheres
      [p1, p2].forEach((pt) => {
        ctx.save();
        ctx.shadowBlur = 16;
        ctx.shadowColor = finger.color;
        ctx.fillStyle = finger.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 2. Draw pulsating energy bridge cable connecting matching fingertips
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.shadowBlur = 18;
      ctx.shadowColor = finger.color;
      ctx.strokeStyle = finger.color;
      ctx.lineWidth = 2.5 + Math.sin(time * 6 + finger.idx) * 0.8;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      const steps = 8;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const perpX = -dy / (dist || 1);
        const perpY = dx / (dist || 1);
        const offset = Math.sin(t * Math.PI * 3 + time * 10) * (6 + chargeLevel * 8);

        const interpX = p1.x + dx * t + perpX * offset;
        const interpY = p1.y + dy * t + perpY * offset;
        ctx.lineTo(interpX, interpY);
      }

      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.0;
      ctx.stroke();
      ctx.restore();

      // 3. Flow energy particles along bridge toward center core
      if (Math.random() < 0.65) {
        const sourcePt = Math.random() < 0.5 ? p1 : p2;
        const t = Math.random();
        const startX = sourcePt.x + (centerCore.x - sourcePt.x) * t;
        const startY = sourcePt.y + (centerCore.y - sourcePt.y) * t;

        const vx = (centerCore.x - startX) * 0.08;
        const vy = (centerCore.y - startY) * 0.08;

        engine.spawn(startX, startY, vx, vy, finger.color, 1.8 + Math.random() * 1.5, 400 + Math.random() * 200, "dust");
      }
    });
  }
}

// 3. Base Class for Elemental Heroes
export abstract class Hero {
  abstract name: string;
  abstract icon: string;
  abstract palette: string[];
  abstract baseColor: string;

  abstract playIdle(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, dt: number): void;
  abstract playCharge(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, dt: number, handDistance?: number): void;
  abstract playImpact(engine: ParticleEngine, x: number, y: number): void;

  playSummoning(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, _dt: number, width?: number, height?: number) {
    const w = width || 1280;
    const h = height || 720;

    // PHASE 3: SUMMONING - Cinematic Expanding Magical Rings & Cosmic Rays
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = this.baseColor;
    ctx.shadowBlur = 25;
    ctx.shadowColor = this.baseColor;

    const time = performance.now() * 0.002;
    for (let r = 1; r <= 3; r++) {
      const ringRadius = (35 * r) + Math.sin(time * 3 + r) * 12;
      ctx.lineWidth = 2.0 / r;
      ctx.beginPath();
      ctx.arc(center.x, center.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Light rays burst
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    for (let ray = 0; ray < 8; ray++) {
      const rayAngle = (ray / 8) * Math.PI * 2 + time;
      const len = 90 + Math.sin(time * 5 + ray) * 25;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(center.x + Math.cos(rayAngle) * len, center.y + Math.sin(rayAngle) * len);
      ctx.stroke();
    }

    ctx.restore();

    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(w, h) * 0.42;
      const startX = center.x + Math.cos(angle) * spawnDist;
      const startY = center.y + Math.sin(angle) * spawnDist;
      const color = this.palette[Math.floor(Math.random() * this.palette.length)]!;

      engine.spawn(
        startX, startY,
        center.x, center.y,
        color,
        2.0 + Math.random() * 2.5,
        700 + Math.random() * 300,
        "spiral",
        { angle, orbitRadius: spawnDist }
      );
    }
  }
}

// 🌌 GALAXY HERO
export class GalaxyHero extends Hero {
  name = "Galaxy";
  icon = "🌌";
  palette = ["#a855f7", "#6366f1", "#06b6d4", "#ffffff"];
  baseColor = "#6366f1";

  private tAngle = 0;

  playIdle(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, dt: number) {
    this.tAngle += dt * 1.5;
    
    if (Math.random() < 0.25) {
      const radius = 30 + Math.random() * 40;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 1.5;
      const color = this.palette[Math.floor(Math.random() * (this.palette.length - 1))]!;
      
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * radius;
      const vx = -Math.sin(angle) * speed;
      const vy = Math.cos(angle) * speed;

      engine.spawn(px, py, vx, vy, color, 1.5 + Math.random() * 2, 1000 + Math.random() * 800, "orbit", {
        angle,
        orbitRadius: radius,
        orbitSpeed: speed
      });
    }

    if (Math.random() < 0.3) {
      const dx = (Math.random() - 0.5) * 40;
      const dy = (Math.random() - 0.5) * 40;
      const vx = (Math.random() - 0.5) * 0.4;
      const vy = (Math.random() - 0.5) * 0.4;
      engine.spawn(center.x + dx, center.y + dy, vx, vy, "#a855f7", 1.0, 1500, "dust", { glow: false });
    }
  }

  playCharge(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, dt: number, handDistance: number = 120) {
    this.tAngle += dt * (2.0 + (handDistance / 100) * 2.5 + charge * 4.0);

    const streamCount = Math.floor(3 + charge * 6 + (handDistance / 50));
    for (let i = 0; i < streamCount; i++) {
      const startAngle = Math.random() * Math.PI * 2;
      const radius = Math.min(220, handDistance * 0.6 + Math.random() * 60);
      const px = center.x + Math.cos(startAngle) * radius;
      const py = center.y + Math.sin(startAngle) * radius;
      const color = this.palette[Math.floor(Math.random() * this.palette.length)]!;
      
      engine.spawn(px, py, center.x, center.y, color, 1.5 + Math.random() * 2.5, 600 + Math.random() * 400, "spiral", {
        angle: startAngle,
        orbitRadius: radius
      });
    }

    const coreRadius = Math.max(12, Math.min(85, (handDistance * 0.22) + charge * 26));
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.shadowBlur = coreRadius * 2.5;
    ctx.shadowColor = "#a855f7";

    const grad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, coreRadius);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.3, "#06b6d4");
    grad.addColorStop(0.7, "#6366f1");
    grad.addColorStop(1, "transparent");
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center.x, center.y, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    if (charge >= 0.90) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.0;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#06b6d4";

      ctx.beginPath();
      ctx.moveTo(center.x - 65, center.y);
      ctx.lineTo(center.x + 65, center.y);
      ctx.moveTo(center.x, center.y - 65);
      ctx.lineTo(center.x, center.y + 65);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 110; i++) {
      const angle = (i / 110) * Math.PI * 2;
      const speed = 3.0 + Math.random() * 6.5;
      const color = this.palette[Math.floor(Math.random() * this.palette.length)]!;
      engine.spawn(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        2.5 + Math.random() * 3.5,
        1200 + Math.random() * 800
      );
    }

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 30;
      const speed = 0.5 + Math.random() * 2.0;
      engine.spawn(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        -Math.sin(angle) * speed,
        Math.cos(angle) * speed,
        "#ffffff",
        2.0,
        1800,
        "orbit",
        { angle, orbitRadius: dist, orbitSpeed: speed }
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

  playIdle(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, _dt: number) {
    if (Math.random() < 0.35) {
      const dx = (Math.random() - 0.5) * 35;
      const dy = (Math.random() - 0.5) * 35;
      const vx = (Math.random() - 0.5) * 3.0;
      const vy = (Math.random() - 0.5) * 3.0;
      engine.spawn(center.x + dx, center.y + dy, vx, vy, "#00f3ff", 1.5, 300 + Math.random() * 200);
    }
  }

  playCharge(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    ctx.save();
    ctx.strokeStyle = "#00f3ff";
    ctx.lineWidth = 1.5 + charge * 2.5;
    ctx.shadowBlur = 12 + charge * 12;
    ctx.shadowColor = "#00f3ff";

    const drawJaggedArc = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const steps = 5;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const cx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 26 * charge;
        const cy = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 26 * charge;
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    const halfDist = Math.min(100, handDistance / 2);
    if (Math.random() < 0.7) {
      drawJaggedArc(center.x - halfDist, center.y, center.x + halfDist, center.y);
      drawJaggedArc(center.x, center.y - halfDist, center.x, center.y + halfDist);
    }

    if (Math.random() < 0.85) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * (halfDist + 20) * charge;
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * radius;
      engine.spawn(px, py, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, "#ffeb3b", 2.0, 200 + Math.random() * 300);
    }

    ctx.restore();
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4.5 + Math.random() * 9.0;
      engine.spawn(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() < 0.35 ? "#ffeb3b" : "#00f3ff",
        2.0 + Math.random() * 2.5,
        400 + Math.random() * 300
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

  playIdle(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, _dt: number) {
    if (Math.random() < 0.45) {
      const dx = (Math.random() - 0.5) * 30;
      const vx = (Math.random() - 0.5) * 0.8;
      const vy = -1.5 - Math.random() * 1.5;
      const color = this.palette[Math.floor(Math.random() * 3)]!;
      engine.spawn(center.x + dx, center.y, vx, vy, color, 2.0 + Math.random() * 2.5, 600 + Math.random() * 300);
    }
  }

  playCharge(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    const spawnRate = Math.floor(4 + charge * 8 + (handDistance / 40));
    for (let i = 0; i < spawnRate; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(120, handDistance * 0.4 + Math.random() * 30);
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + 40 - Math.random() * 80;
      
      const vx = -Math.sin(angle) * (2.0 + charge * 3.5);
      const vy = -3.5 - charge * 5.0;
      const color = this.palette[Math.floor(Math.random() * 3)]!;

      engine.spawn(px, py, vx, vy, color, 2.5 + Math.random() * 3.5, 500 + Math.random() * 300);
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 7.0;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 1.5;
      const color = this.palette[Math.floor(Math.random() * this.palette.length)]!;
      
      engine.spawn(
        x, y,
        vx, vy,
        color,
        3.0 + Math.random() * 4.0,
        800 + Math.random() * 500
      );
    }
  }
}

// ❄ ICE HERO
export class IceHero extends Hero {
  name = "Ice";
  icon = "❄";
  palette = ["#a5f3fc", "#e0f2fe", "#ffffff"];
  baseColor = "#a5f3fc";

  playIdle(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, _dt: number) {
    if (Math.random() < 0.25) {
      const dx = (Math.random() - 0.5) * 45;
      const dy = (Math.random() - 0.5) * 45;
      const vx = (Math.random() - 0.5) * 0.3;
      const vy = 0.5 + Math.random() * 0.8;
      engine.spawn(center.x + dx, center.y + dy, vx, vy, "#e0f2fe", 1.5, 1200 + Math.random() * 600, "dust", { glow: false });
    }
  }

  playCharge(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    const count = Math.floor(2 + charge * 4 + (handDistance / 40));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(100, handDistance * 0.4);
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * radius;
      
      const vx = (Math.random() - 0.5) * 0.3;
      const vy = (Math.random() - 0.5) * 0.3;

      engine.spawn(px, py, vx, vy, "#a5f3fc", 2.0 + Math.random() * 2.0, 800, "dust");
    }

    ctx.save();
    ctx.strokeStyle = "rgba(165, 243, 252, 0.7)";
    ctx.lineWidth = 1.5 + charge * 2.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#a5f3fc";
    ctx.beginPath();
    
    const sides = 6;
    const r = Math.max(12, Math.min(70, handDistance * 0.3 + charge * 20));
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const px = center.x + Math.cos(angle) * r;
      const py = center.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.5;
      engine.spawn(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() < 0.4 ? "#ffffff" : "#a5f3fc",
        2.5 + Math.random() * 3.0,
        1000 + Math.random() * 400
      );
    }
  }
}

// 🌊 WATER HERO
export class WaterHero extends Hero {
  name = "Water";
  icon = "🌊";
  palette = ["#0ea5e9", "#3b82f6", "#ffffff"];
  baseColor = "#3b82f6";

  playIdle(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, _dt: number) {
    if (Math.random() < 0.3) {
      const dx = (Math.random() - 0.5) * 40;
      const dy = (Math.random() - 0.5) * 40;
      const vx = (Math.random() - 0.5) * 0.4;
      const vy = (Math.random() - 0.5) * 0.4;
      engine.spawn(center.x + dx, center.y + dy, vx, vy, "#0ea5e9", 2.0, 1000, "dust", { glow: false });
    }
  }

  playCharge(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    const radius = Math.max(15, Math.min(80, handDistance * 0.35 + charge * 25));
    ctx.save();
    ctx.strokeStyle = "rgba(14, 165, 233, 0.6)";
    ctx.lineWidth = 2.0 + charge * 3.0;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const count = Math.floor(3 + charge * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * radius;
      
      const vx = -Math.sin(angle) * 1.8;
      const vy = Math.cos(angle) * 1.8;

      engine.spawn(px, py, vx, vy, "#3b82f6", 2.0 + Math.random() * 2.0, 600);
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 75; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.0;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed + 0.8;
      
      engine.spawn(
        x, y,
        vx, vy,
        "#0ea5e9",
        2.5 + Math.random() * 3.0,
        900 + Math.random() * 300
      );
    }
  }
}

// 🌪 WIND HERO
export class WindHero extends Hero {
  name = "Wind";
  icon = "🌪";
  palette = ["#94a3b8", "#cbd5e1", "#e2e8f0"];
  baseColor = "#cbd5e1";

  playIdle(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, _dt: number) {
    if (Math.random() < 0.25) {
      const dx = (Math.random() - 0.5) * 50;
      const dy = (Math.random() - 0.5) * 50;
      const vx = 1.0 + Math.random() * 1.5;
      const vy = (Math.random() - 0.5) * 0.4;
      engine.spawn(center.x + dx, center.y + dy, vx, vy, "#cbd5e1", 1.0, 800, "dust", { glow: false });
    }
  }

  playCharge(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    const count = Math.floor(4 + charge * 6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(110, handDistance * 0.45);
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * radius;
      
      const vx = -Math.sin(angle) * (3.5 + charge * 5.0);
      const vy = Math.cos(angle) * (3.5 + charge * 5.0);

      engine.spawn(px, py, vx, vy, "#e2e8f0", 1.5 + Math.random() * 1.5, 400 + Math.random() * 200, "dust", { glow: false });
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 65; i++) {
      const angle = (i / 65) * Math.PI * 2;
      const speed = 4.0 + Math.random() * 7.0;
      engine.spawn(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        "#cbd5e1",
        1.5 + Math.random() * 2.0,
        600 + Math.random() * 300,
        "dust",
        { glow: false }
      );
    }
  }
}

// ☀️ SOLAR HERO
export class SolarHero extends Hero {
  name = "Solar";
  icon = "☀️";
  palette = ["#eab308", "#f97316", "#ffffff"];
  baseColor = "#eab308";

  playIdle(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, _dt: number) {
    if (Math.random() < 0.35) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 25;
      const px = center.x + Math.cos(angle) * dist;
      const py = center.y + Math.sin(angle) * dist;
      const vx = Math.cos(angle) * 0.8;
      const vy = Math.sin(angle) * 0.8;
      engine.spawn(px, py, vx, vy, "#eab308", 2.0, 600);
    }
  }

  playCharge(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.shadowBlur = 18 + charge * 30;
    ctx.shadowColor = "#f97316";

    const r = Math.max(15, Math.min(90, handDistance * 0.35 + charge * 30));
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

    if (Math.random() < 0.6) {
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * (2.0 + charge * 4.0);
      const vy = Math.sin(angle) * (2.0 + charge * 4.0);
      engine.spawn(center.x, center.y, vx, vy, "#f97316", 2.5, 400 + Math.random() * 400);
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 85; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 8.0;
      engine.spawn(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() < 0.4 ? "#ffffff" : "#f97316",
        3.0 + Math.random() * 3.5,
        900 + Math.random() * 400
      );
    }
  }
}

// 🌙 LUNAR HERO
export class LunarHero extends Hero {
  name = "Lunar";
  icon = "🌙";
  palette = ["#38bdf8", "#94a3b8", "#e2e8f0"];
  baseColor = "#38bdf8";

  playIdle(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, _dt: number) {
    if (Math.random() < 0.25) {
      const dx = (Math.random() - 0.5) * 45;
      const dy = (Math.random() - 0.5) * 45;
      const vx = (Math.random() - 0.5) * 0.3;
      const vy = (Math.random() - 0.5) * 0.3;
      engine.spawn(center.x + dx, center.y + dy, vx, vy, "#94a3b8", 1.5, 1500, "dust");
    }
  }

  playCharge(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
    ctx.lineWidth = 2.0 + charge * 3.0;
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#38bdf8";

    ctx.beginPath();
    const r = Math.max(15, Math.min(80, handDistance * 0.35 + charge * 25));
    ctx.arc(center.x, center.y, r, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.restore();

    if (Math.random() < 0.65) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 30;
      const px = center.x + Math.cos(angle) * dist;
      const py = center.y + Math.sin(angle) * dist;
      const vx = -Math.sin(angle) * 1.4;
      const vy = Math.cos(angle) * 1.4;
      engine.spawn(px, py, vx, vy, "#e2e8f0", 2.0, 700);
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 75; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.0;
      engine.spawn(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() < 0.5 ? "#38bdf8" : "#e2e8f0",
        2.0 + Math.random() * 2.5,
        1000 + Math.random() * 300
      );
    }
  }
}

// 💎 CRYSTAL HERO
export class CrystalHero extends Hero {
  name = "Crystal";
  icon = "💎";
  palette = ["#f43f5e", "#d946ef", "#ffffff"];
  baseColor = "#f43f5e";

  playIdle(_ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, _dt: number) {
    if (Math.random() < 0.25) {
      const dx = (Math.random() - 0.5) * 35;
      const dy = (Math.random() - 0.5) * 35;
      const vx = (Math.random() - 0.5) * 0.1;
      const vy = (Math.random() - 0.5) * 0.1;
      engine.spawn(center.x + dx, center.y + dy, vx, vy, "#f43f5e", 2.0, 900);
    }
  }

  playCharge(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, engine: ParticleEngine, charge: number, _dt: number, handDistance: number = 120) {
    ctx.save();
    ctx.strokeStyle = "rgba(217, 70, 239, 0.8)";
    ctx.lineWidth = 1.5 + charge * 2.0;
    ctx.shadowBlur = 12;
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

    const dw = Math.max(10, Math.min(65, handDistance * 0.25 + charge * 20));
    const dh = Math.max(14, Math.min(90, handDistance * 0.35 + charge * 28));
    drawDiamond(center.x, center.y, dw, dh);
    ctx.restore();

    if (Math.random() < 0.75) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 30;
      const px = center.x + Math.cos(angle) * dist;
      const py = center.y + Math.sin(angle) * dist;
      engine.spawn(px, py, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, "#ffffff", 2.5, 500);
    }
  }

  playImpact(engine: ParticleEngine, x: number, y: number) {
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.5;
      engine.spawn(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() < 0.4 ? "#d946ef" : "#f43f5e",
        2.5 + Math.random() * 3.0,
        1000 + Math.random() * 400
      );
    }
  }
}

// 4. Projectile & Impact System manager
export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private impacts: Impact[] = [];

  launch(x: number, y: number, vx: number, vy: number, color: string, type: string) {
    const angle = Math.atan2(vy, vx);
    this.projectiles.push({
      id: Math.random().toString(),
      x,
      y,
      vx,
      vy,
      color,
      size: 24,
      type,
      life: 2500,
      maxLife: 2500,
      angle,
      rotationSpeed: type === "galaxy" ? 6.0 : 2.0
    });
  }

  update(dt: number, width: number, height: number, engine: ParticleEngine, activeHero: Hero) {
    const deadProjs: Projectile[] = [];
    const deadImpacts: Impact[] = [];

    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i]!;
      p.life -= dt * 1000;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.angle += p.rotationSpeed * dt;

      if (Math.random() < 0.85) {
        const backAngle = p.angle + Math.PI + (Math.random() - 0.5) * 0.5;
        const trailVx = Math.cos(backAngle) * 2.5 - p.vx * 0.1;
        const trailVy = Math.sin(backAngle) * 2.5 - p.vy * 0.1;
        engine.spawn(p.x, p.y, trailVx, trailVy, p.color, 3.5 + Math.random() * 2.5, 500 + Math.random() * 300);
      }

      const offscreen = p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50;
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
      imp.radius += 120 * dt;
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
      radius: 5
    });

    hero.playImpact(engine, x, y);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i]!;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      ctx.shadowBlur = p.size * 2.5;
      ctx.shadowColor = p.color;

      if (p.type === "galaxy") {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.5, "#a855f7");
        grad.addColorStop(1.0, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "lightning") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(0, -10);
        ctx.lineTo(0, 10);
        ctx.lineTo(p.size, 0);
        ctx.stroke();
      } else {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.6, p.color);
        grad.addColorStop(1.0, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    for (let i = 0; i < this.impacts.length; i++) {
      const imp = this.impacts[i]!;
      const opacity = Math.max(0, imp.life / imp.maxLife);
      ctx.strokeStyle = imp.color;
      ctx.lineWidth = 4.0 * opacity;
      ctx.globalAlpha = opacity;
      ctx.shadowBlur = 15;
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
  }
}
