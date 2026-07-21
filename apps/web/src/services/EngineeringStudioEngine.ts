// VisionCanvas AR | Premium Spatial CAD Engine (Apple Vision Pro / Reality Composer Pro Quality)

export type EngineeringDomain = "architecture" | "mechanical" | "electrical" | "robotics";

export interface ParametricMaterial {
  fillColor: string;
  strokeColor: string;
  shadowColor: string;
  texturePattern?: "concrete" | "glass" | "wood" | "steel" | "aluminum" | "carbon" | "pcb" | "copper";
}

export interface ParametricComponent {
  id: string;
  name: string;
  domain: EngineeringDomain;
  type: "wall" | "door" | "window" | "column" | "beam" | "roof" | "floor" | "pipe" | "gear" | "motor" | "bearing" | "battery" | "led" | "switch" | "sensor" | "robot_arm";
  defaultWidth: number;
  defaultHeight: number;
  material: ParametricMaterial;
}

export interface SpatialCADNode {
  id: string;
  type: ParametricComponent["type"];
  name: string;
  domain: EngineeringDomain;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
  rotation: number;
  material: ParametricMaterial;
  selected: boolean;
  parentWallId?: string | undefined;
  // Animation state
  scale: number; // For placement materialize animation (0.0 to 1.0)
  alpha: number;
}

export class EngineeringStudioEngine {
  public activeDomain: EngineeringDomain = "architecture";
  public nodes: SpatialCADNode[] = [];
  public selectedNodeId: string | null = null;
  public activeWallStart: { x: number; y: number } | null = null;
  public gridStep = 20;

  // Grid fade transition animation (0.0 = subtle idle 6%, 1.0 = active placement 18%)
  private gridFadeAlpha = 0.06;

  public static CATALOG: ParametricComponent[] = [
    // Architecture Domain
    {
      id: "wall",
      name: "Wall Span",
      domain: "architecture",
      type: "wall",
      defaultWidth: 160,
      defaultHeight: 22,
      material: { fillColor: "#475569", strokeColor: "#94a3b8", shadowColor: "rgba(15, 23, 42, 0.6)", texturePattern: "concrete" }
    },
    {
      id: "door",
      name: "Timber Door",
      domain: "architecture",
      type: "door",
      defaultWidth: 44,
      defaultHeight: 20,
      material: { fillColor: "#78350f", strokeColor: "#d97706", shadowColor: "rgba(120, 53, 15, 0.4)", texturePattern: "wood" }
    },
    {
      id: "window",
      name: "Glass Window",
      domain: "architecture",
      type: "window",
      defaultWidth: 54,
      defaultHeight: 20,
      material: { fillColor: "rgba(56, 189, 248, 0.35)", strokeColor: "#38bdf8", shadowColor: "rgba(56, 189, 248, 0.4)", texturePattern: "glass" }
    },
    {
      id: "column",
      name: "Concrete Column",
      domain: "architecture",
      type: "column",
      defaultWidth: 36,
      defaultHeight: 36,
      material: { fillColor: "#334155", strokeColor: "#64748b", shadowColor: "rgba(0, 0, 0, 0.5)", texturePattern: "concrete" }
    },
    {
      id: "beam",
      name: "Steel Beam",
      domain: "architecture",
      type: "beam",
      defaultWidth: 150,
      defaultHeight: 16,
      material: { fillColor: "#1e293b", strokeColor: "#38bdf8", shadowColor: "rgba(30, 41, 59, 0.5)", texturePattern: "steel" }
    },
    {
      id: "roof",
      name: "Roof Structure",
      domain: "architecture",
      type: "roof",
      defaultWidth: 180,
      defaultHeight: 48,
      material: { fillColor: "#991b1b", strokeColor: "#f87171", shadowColor: "rgba(153, 27, 27, 0.5)", texturePattern: "concrete" }
    },
    {
      id: "floor",
      name: "Floor Slab",
      domain: "architecture",
      type: "floor",
      defaultWidth: 200,
      defaultHeight: 120,
      material: { fillColor: "#334155", strokeColor: "#475569", shadowColor: "rgba(0, 0, 0, 0.3)", texturePattern: "concrete" }
    },

    // Mechanical Domain
    {
      id: "pipe",
      name: "Fluid Pipe",
      domain: "mechanical",
      type: "pipe",
      defaultWidth: 130,
      defaultHeight: 18,
      material: { fillColor: "#0284c7", strokeColor: "#38bdf8", shadowColor: "rgba(2, 132, 199, 0.4)", texturePattern: "aluminum" }
    },
    {
      id: "gear",
      name: "Precision Gear",
      domain: "mechanical",
      type: "gear",
      defaultWidth: 56,
      defaultHeight: 56,
      material: { fillColor: "#ca8a04", strokeColor: "#fde047", shadowColor: "rgba(202, 138, 4, 0.4)", texturePattern: "aluminum" }
    },
    {
      id: "motor",
      name: "Servo Drive",
      domain: "mechanical",
      type: "motor",
      defaultWidth: 50,
      defaultHeight: 50,
      material: { fillColor: "#7e22ce", strokeColor: "#c084fc", shadowColor: "rgba(126, 34, 206, 0.4)", texturePattern: "carbon" }
    },
    {
      id: "bearing",
      name: "Ball Bearing",
      domain: "mechanical",
      type: "bearing",
      defaultWidth: 38,
      defaultHeight: 38,
      material: { fillColor: "#475569", strokeColor: "#e2e8f0", shadowColor: "rgba(0, 0, 0, 0.4)", texturePattern: "steel" }
    },

    // Electrical Domain
    {
      id: "battery",
      name: "Li-Po Cell",
      domain: "electrical",
      type: "battery",
      defaultWidth: 68,
      defaultHeight: 40,
      material: { fillColor: "#15803d", strokeColor: "#4ade80", shadowColor: "rgba(21, 128, 61, 0.4)", texturePattern: "pcb" }
    },
    {
      id: "led",
      name: "Status LED",
      domain: "electrical",
      type: "led",
      defaultWidth: 26,
      defaultHeight: 26,
      material: { fillColor: "#be123c", strokeColor: "#fb7185", shadowColor: "rgba(190, 18, 60, 0.5)", texturePattern: "copper" }
    },
    {
      id: "switch",
      name: "Toggle Switch",
      domain: "electrical",
      type: "switch",
      defaultWidth: 30,
      defaultHeight: 30,
      material: { fillColor: "#c2410c", strokeColor: "#fb923c", shadowColor: "rgba(194, 65, 12, 0.4)", texturePattern: "copper" }
    },

    // Robotics Domain
    {
      id: "sensor",
      name: "LiDAR Sensor",
      domain: "robotics",
      type: "sensor",
      defaultWidth: 36,
      defaultHeight: 36,
      material: { fillColor: "#0f766e", strokeColor: "#2dd4bf", shadowColor: "rgba(15, 118, 110, 0.4)", texturePattern: "carbon" }
    },
    {
      id: "robot_arm",
      name: "Robot Arm Joint",
      domain: "robotics",
      type: "robot_arm",
      defaultWidth: 96,
      defaultHeight: 32,
      material: { fillColor: "#be185d", strokeColor: "#f472b6", shadowColor: "rgba(190, 24, 93, 0.4)", texturePattern: "carbon" }
    }
  ];

  setDomain(domain: EngineeringDomain) {
    this.activeDomain = domain;
  }

  snapPoint(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.round(x / this.gridStep) * this.gridStep,
      y: Math.round(y / this.gridStep) * this.gridStep
    };
  }

  findNearestWall(x: number, y: number): SpatialCADNode | null {
    for (const node of this.nodes) {
      if (node.type === "wall") {
        const minX = Math.min(node.x1, node.x2) - 30;
        const maxX = Math.max(node.x1, node.x2) + 30;
        const minY = Math.min(node.y1, node.y2) - 30;
        const maxY = Math.max(node.y1, node.y2) + 30;

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          return node;
        }
      }
    }
    return null;
  }

  addParametricComponent(type: ParametricComponent["type"], x: number, y: number): SpatialCADNode | null {
    const comp = EngineeringStudioEngine.CATALOG.find(c => c.type === type);
    if (!comp) return null;

    const p = this.snapPoint(x, y);
    this.nodes.forEach(n => n.selected = false);

    let newNode: SpatialCADNode;

    if (type === "wall" || type === "pipe" || type === "beam") {
      if (!this.activeWallStart) {
        this.activeWallStart = { x: p.x, y: p.y };
        return null;
      } else {
        newNode = {
          id: Math.random().toString(36).substring(2, 9),
          type,
          name: comp.name,
          domain: comp.domain,
          x1: this.activeWallStart.x,
          y1: this.activeWallStart.y,
          x2: p.x,
          y2: p.y,
          width: Math.hypot(p.x - this.activeWallStart.x, p.y - this.activeWallStart.y),
          height: comp.defaultHeight,
          rotation: Math.atan2(p.y - this.activeWallStart.y, p.x - this.activeWallStart.x) * (180 / Math.PI),
          material: comp.material,
          selected: true,
          scale: 0.2, // Animate materialize scale
          alpha: 0.1
        };
        this.activeWallStart = null;
      }
    } else if (type === "door" || type === "window") {
      const targetWall = this.findNearestWall(p.x, p.y);
      newNode = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        name: comp.name,
        domain: comp.domain,
        x1: p.x - comp.defaultWidth / 2,
        y1: p.y - comp.defaultHeight / 2,
        x2: p.x + comp.defaultWidth / 2,
        y2: p.y + comp.defaultHeight / 2,
        width: comp.defaultWidth,
        height: comp.defaultHeight,
        rotation: targetWall ? targetWall.rotation : 0,
        material: comp.material,
        selected: true,
        parentWallId: targetWall ? targetWall.id : undefined,
        scale: 0.2,
        alpha: 0.1
      };
    } else {
      newNode = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        name: comp.name,
        domain: comp.domain,
        x1: p.x - comp.defaultWidth / 2,
        y1: p.y - comp.defaultHeight / 2,
        x2: p.x + comp.defaultWidth / 2,
        y2: p.y + comp.defaultHeight / 2,
        width: comp.defaultWidth,
        height: comp.defaultHeight,
        rotation: 0,
        material: comp.material,
        selected: true,
        scale: 0.2,
        alpha: 0.1
      };
    }

    this.nodes.push(newNode);
    this.selectedNodeId = newNode.id;
    return newNode;
  }

  rotateSelectedNode() {
    if (!this.selectedNodeId) return;
    const node = this.nodes.find(n => n.id === this.selectedNodeId);
    if (node) {
      node.rotation = (node.rotation + 45) % 360;
    }
  }

  deleteSelectedNode() {
    if (!this.selectedNodeId) return;
    this.nodes = this.nodes.filter(n => n.id !== this.selectedNodeId);
    this.selectedNodeId = null;
  }

  clear() {
    this.nodes = [];
    this.selectedNodeId = null;
    this.activeWallStart = null;
  }

  // Update animations (Smooth placement scale & grid fade transitions)
  update(dt: number) {
    // 1. Smoothly interpolate node placement materialize scale
    this.nodes.forEach(node => {
      if (node.scale < 1.0) {
        node.scale += dt * 5.0; // Rapid soft spring scale
        if (node.scale > 1.0) node.scale = 1.0;
      }
      if (node.alpha < 1.0) {
        node.alpha += dt * 4.0;
        if (node.alpha > 1.0) node.alpha = 1.0;
      }
    });
  }

  // Render Premium Spatial CAD View
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cursorPos: { x: number; y: number } | null,
    activeType: ParametricComponent["type"] | null
  ) {
    ctx.save();

    const isPlacing = cursorPos !== null && (activeType !== null || this.activeWallStart !== null);

    // 1. Grid Fade Transition (5-8% ultra-subtle thin lines, every 5th line 12%)
    const targetGridAlpha = isPlacing ? 0.14 : 0.05;
    this.gridFadeAlpha += (targetGridAlpha - this.gridFadeAlpha) * 0.15;

    ctx.lineWidth = 0.6;
    let colIdx = 0;
    for (let x = 0; x < width; x += this.gridStep) {
      colIdx++;
      const isFifth = colIdx % 5 === 0;
      ctx.strokeStyle = isFifth
        ? `rgba(255, 255, 255, ${this.gridFadeAlpha * 2.2})`
        : `rgba(255, 255, 255, ${this.gridFadeAlpha})`;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    let rowIdx = 0;
    for (let y = 0; y < height; y += this.gridStep) {
      rowIdx++;
      const isFifth = rowIdx % 5 === 0;
      ctx.strokeStyle = isFifth
        ? `rgba(255, 255, 255, ${this.gridFadeAlpha * 2.2})`
        : `rgba(255, 255, 255, ${this.gridFadeAlpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Render Materialized Spatial CAD Objects (Concrete, Glass, Wood, Steel, Aluminum, Carbon)
    this.nodes.forEach(node => {
      ctx.save();
      ctx.globalAlpha = node.alpha;

      if (node.type === "wall" || node.type === "pipe" || node.type === "beam") {
        // Materialized Wall/Pipe with Thickness & Soft Ambient Drop Shadow
        ctx.shadowBlur = node.selected ? 22 : 12;
        ctx.shadowColor = node.selected ? "#38bdf8" : node.material.shadowColor;
        ctx.shadowOffsetY = 4;

        ctx.strokeStyle = node.material.fillColor;
        ctx.lineWidth = node.height * node.scale;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(node.x1, node.y1);
        ctx.lineTo(node.x2, node.y2);
        ctx.stroke();

        // Subtle Bevel Border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = node.material.strokeColor;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Measurements & Labels displayed STRICTLY when selected
        if (node.selected) {
          const midX = (node.x1 + node.x2) / 2;
          const midY = (node.y1 + node.y2) / 2;
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${node.name} • ${Math.round(node.width)}mm • ${Math.round(node.rotation)}°`, midX, midY - 14);
        }

      } else {
        // Materialized Discrete Object with Soft Ambient Depth
        const cx = (node.x1 + node.x2) / 2;
        const cy = (node.y1 + node.y2) / 2;

        ctx.translate(cx, cy);
        ctx.rotate((node.rotation * Math.PI) / 180);
        ctx.scale(node.scale, node.scale);

        ctx.shadowBlur = node.selected ? 24 : 14;
        ctx.shadowColor = node.selected ? "#38bdf8" : node.material.shadowColor;
        ctx.shadowOffsetY = 5;

        ctx.fillStyle = node.material.fillColor;
        ctx.fillRect(-node.width / 2, -node.height / 2, node.width, node.height);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = node.selected ? "#ffffff" : node.material.strokeColor;
        ctx.lineWidth = node.selected ? 2.5 : 1.2;
        ctx.strokeRect(-node.width / 2, -node.height / 2, node.width, node.height);

        // Labels & Rotation displayed STRICTLY when selected
        if (node.selected) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${node.name} • ${Math.round(node.rotation)}°`, 0, -node.height / 2 - 8);
        }
      }

      ctx.restore();
    });

    // 3. Render Active Wall Rubberband Line during placement with Single Cursor Measurement
    if (this.activeWallStart && cursorPos) {
      const p = this.snapPoint(cursorPos.x, cursorPos.y);
      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 16;
      ctx.lineCap = "round";
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#38bdf8";
      ctx.globalAlpha = 0.8;

      ctx.beginPath();
      ctx.moveTo(this.activeWallStart.x, this.activeWallStart.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      const len = Math.hypot(p.x - this.activeWallStart.x, p.y - this.activeWallStart.y);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(`${Math.round(len)}mm`, p.x + 12, p.y - 12);
      ctx.restore();
    }

    // 4. Ghost Preview with Soft Glow prior to placement
    if (cursorPos && activeType && !this.activeWallStart) {
      const p = this.snapPoint(cursorPos.x, cursorPos.y);
      const comp = EngineeringStudioEngine.CATALOG.find(c => c.type === activeType);
      if (comp) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = 0.5;

        if (activeType === "door" || activeType === "window") {
          const targetWall = this.findNearestWall(p.x, p.y);
          if (targetWall) {
            ctx.rotate((targetWall.rotation * Math.PI) / 180);
          }
        }

        ctx.fillStyle = comp.material.fillColor;
        ctx.fillRect(-comp.defaultWidth / 2, -comp.defaultHeight / 2, comp.defaultWidth, comp.defaultHeight);

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.0;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-comp.defaultWidth / 2, -comp.defaultHeight / 2, comp.defaultWidth, comp.defaultHeight);

        ctx.restore();
      }
    }

    ctx.restore();
  }
}
