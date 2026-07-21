// "Less UI, More Interaction" Spatial CAD Engine for VisionCanvas AR Engineering Studio
// Inspired by SketchUp, Autodesk Fusion 360, and Apple Vision Pro Spatial Tools

export type EngineeringDomain = "architecture" | "mechanical" | "electrical" | "robotics";

export interface ParametricComponent {
  id: string;
  name: string;
  domain: EngineeringDomain;
  type: "wall" | "door" | "window" | "column" | "beam" | "roof" | "floor" | "pipe" | "gear" | "motor" | "bearing" | "battery" | "led" | "switch" | "sensor" | "robot_arm";
  color: string;
  defaultWidth: number;
  defaultHeight: number;
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
  color: string;
  selected: boolean;
  parentWallId?: string | undefined;
}

export class EngineeringStudioEngine {
  public activeDomain: EngineeringDomain = "architecture";
  public nodes: SpatialCADNode[] = [];
  public selectedNodeId: string | null = null;
  public activeWallStart: { x: number; y: number } | null = null;
  public gridStep = 20;

  public static CATALOG: ParametricComponent[] = [
    // Architecture
    { id: "wall", name: "Wall Span", domain: "architecture", type: "wall", color: "#64748b", defaultWidth: 160, defaultHeight: 18 },
    { id: "door", name: "Embedded Door", domain: "architecture", type: "door", color: "#b45309", defaultWidth: 42, defaultHeight: 18 },
    { id: "window", name: "Glass Window", domain: "architecture", type: "window", color: "#38bdf8", defaultWidth: 50, defaultHeight: 18 },
    { id: "column", name: "Column", domain: "architecture", type: "column", color: "#334155", defaultWidth: 32, defaultHeight: 32 },
    { id: "beam", name: "Steel Beam", domain: "architecture", type: "beam", color: "#475569", defaultWidth: 140, defaultHeight: 14 },
    { id: "roof", name: "Roof Truss", domain: "architecture", type: "roof", color: "#ef4444", defaultWidth: 180, defaultHeight: 45 },
    { id: "floor", name: "Floor Slab", domain: "architecture", type: "floor", color: "#94a3b8", defaultWidth: 200, defaultHeight: 120 },

    // Mechanical
    { id: "pipe", name: "Fluid Pipe", domain: "mechanical", type: "pipe", color: "#06b6d4", defaultWidth: 120, defaultHeight: 16 },
    { id: "gear", name: "Gear", domain: "mechanical", type: "gear", color: "#eab308", defaultWidth: 54, defaultHeight: 54 },
    { id: "motor", name: "Servo Motor", domain: "mechanical", type: "motor", color: "#a855f7", defaultWidth: 48, defaultHeight: 48 },
    { id: "bearing", name: "Bearing", domain: "mechanical", type: "bearing", color: "#cbd5e1", defaultWidth: 36, defaultHeight: 36 },

    // Electrical & Robotics
    { id: "battery", name: "Battery Cell", domain: "electrical", type: "battery", color: "#22c55e", defaultWidth: 64, defaultHeight: 38 },
    { id: "led", name: "Status LED", domain: "electrical", type: "led", color: "#f43f5e", defaultWidth: 24, defaultHeight: 24 },
    { id: "switch", name: "Switch", domain: "electrical", type: "switch", color: "#f97316", defaultWidth: 28, defaultHeight: 28 },
    { id: "sensor", name: "LiDAR Sensor", domain: "robotics", type: "sensor", color: "#14b8a6", defaultWidth: 34, defaultHeight: 34 },
    { id: "robot_arm", name: "Robot Arm", domain: "robotics", type: "robot_arm", color: "#ec4899", defaultWidth: 90, defaultHeight: 30 }
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
        const minX = Math.min(node.x1, node.x2) - 25;
        const maxX = Math.max(node.x1, node.x2) + 25;
        const minY = Math.min(node.y1, node.y2) - 25;
        const maxY = Math.max(node.y1, node.y2) + 25;

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
          color: comp.color,
          selected: true
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
        color: comp.color,
        selected: true,
        parentWallId: targetWall ? targetWall.id : undefined
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
        color: comp.color,
        selected: true
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

  // Render "Less UI, More Interaction" Spatial CAD View
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cursorPos: { x: number; y: number } | null,
    activeType: ParametricComponent["type"] | null
  ) {
    ctx.save();

    const isPlacing = cursorPos !== null && (activeType !== null || this.activeWallStart !== null);

    // 1. Subtle 10-15% Opacity CAD Grid (Prominent only during active placement)
    ctx.strokeStyle = isPlacing ? "rgba(56, 189, 248, 0.18)" : "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 0.8;

    for (let x = 0; x < width; x += this.gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += this.gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Render Parametric CAD Objects (Clean visual rendering, NO labels unless selected)
    this.nodes.forEach(node => {
      ctx.save();

      if (node.type === "wall" || node.type === "pipe" || node.type === "beam") {
        ctx.strokeStyle = node.color;
        ctx.lineWidth = node.height;
        ctx.lineCap = "round";

        if (node.selected) {
          ctx.shadowBlur = 18;
          ctx.shadowColor = "#38bdf8";
        }

        ctx.beginPath();
        ctx.moveTo(node.x1, node.y1);
        ctx.lineTo(node.x2, node.y2);
        ctx.stroke();

        // White core line for selected linear component
        if (node.selected) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.0;
          ctx.stroke();

          // Measurement label displayed STRICTLY when selected
          const midX = (node.x1 + node.x2) / 2;
          const midY = (node.y1 + node.y2) / 2;
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${node.name} (${Math.round(node.width)}mm)`, midX, midY - 12);
        }

      } else {
        const cx = (node.x1 + node.x2) / 2;
        const cy = (node.y1 + node.y2) / 2;

        ctx.translate(cx, cy);
        ctx.rotate((node.rotation * Math.PI) / 180);

        if (node.selected) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = "#38bdf8";
        }

        ctx.fillStyle = node.color;
        ctx.fillRect(-node.width / 2, -node.height / 2, node.width, node.height);

        ctx.strokeStyle = node.selected ? "#ffffff" : "rgba(255,255,255,0.3)";
        ctx.lineWidth = node.selected ? 2.5 : 1.0;
        ctx.strokeRect(-node.width / 2, -node.height / 2, node.width, node.height);

        // Name label displayed STRICTLY when selected
        if (node.selected) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(node.name, 0, 4);
        }
      }

      ctx.restore();
    });

    // 3. Render Wall/Pipe Rubberband Line during placement
    if (this.activeWallStart && cursorPos) {
      const p = this.snapPoint(cursorPos.x, cursorPos.y);
      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.shadowBlur = 16;
      ctx.shadowColor = "#38bdf8";
      ctx.globalAlpha = 0.75;

      ctx.beginPath();
      ctx.moveTo(this.activeWallStart.x, this.activeWallStart.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      const len = Math.hypot(p.x - this.activeWallStart.x, p.y - this.activeWallStart.y);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`${Math.round(len)}mm`, (this.activeWallStart.x + p.x) / 2, (this.activeWallStart.y + p.y) / 2 - 12);
      ctx.restore();
    }

    // 4. Ghost Preview with Magnetic Wall Snapping for Door / Window / Components
    if (cursorPos && activeType && !this.activeWallStart) {
      const p = this.snapPoint(cursorPos.x, cursorPos.y);
      const comp = EngineeringStudioEngine.CATALOG.find(c => c.type === activeType);
      if (comp) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = 0.55;

        if (activeType === "door" || activeType === "window") {
          const targetWall = this.findNearestWall(p.x, p.y);
          if (targetWall) {
            ctx.rotate((targetWall.rotation * Math.PI) / 180);
          }
        }

        ctx.fillStyle = comp.color;
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
