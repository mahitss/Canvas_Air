// Parametric Spatial CAD Engine for VisionCanvas AR Engineering Studio
// Inspired by Autodesk Fusion 360, SketchUp, and Apple Vision Pro Spatial Apps

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
  // Position / Geometry
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  selected: boolean;
  parentWallId?: string | undefined; // For embedded windows/doors
}

export class EngineeringStudioEngine {
  public activeDomain: EngineeringDomain = "architecture";
  public nodes: SpatialCADNode[] = [];
  public selectedNodeId: string | null = null;
  public activeWallStart: { x: number; y: number } | null = null;
  public gridStep = 20; // Crisp CAD grid snap
  public isSnapEnabled = true;

  private history: SpatialCADNode[][] = [];
  private historyIdx = -1;

  public static CATALOG: ParametricComponent[] = [
    // Architecture
    { id: "wall", name: "Wall Span", domain: "architecture", type: "wall", color: "#64748b", defaultWidth: 160, defaultHeight: 18 },
    { id: "door", name: "Embedded Door", domain: "architecture", type: "door", color: "#b45309", defaultWidth: 42, defaultHeight: 18 },
    { id: "window", name: "Glass Window", domain: "architecture", type: "window", color: "#38bdf8", defaultWidth: 50, defaultHeight: 18 },
    { id: "column", name: "Structural Column", domain: "architecture", type: "column", color: "#334155", defaultWidth: 32, defaultHeight: 32 },
    { id: "beam", name: "Steel Beam", domain: "architecture", type: "beam", color: "#475569", defaultWidth: 140, defaultHeight: 14 },
    { id: "roof", name: "Roof Truss", domain: "architecture", type: "roof", color: "#ef4444", defaultWidth: 180, defaultHeight: 45 },
    { id: "floor", name: "Floor Slab", domain: "architecture", type: "floor", color: "#94a3b8", defaultWidth: 200, defaultHeight: 120 },

    // Mechanical
    { id: "pipe", name: "Fluid Pipe", domain: "mechanical", type: "pipe", color: "#06b6d4", defaultWidth: 120, defaultHeight: 16 },
    { id: "gear", name: "Precision Gear", domain: "mechanical", type: "gear", color: "#eab308", defaultWidth: 54, defaultHeight: 54 },
    { id: "motor", name: "Servo Drive", domain: "mechanical", type: "motor", color: "#a855f7", defaultWidth: 48, defaultHeight: 48 },
    { id: "bearing", name: "Ball Bearing", domain: "mechanical", type: "bearing", color: "#cbd5e1", defaultWidth: 36, defaultHeight: 36 },

    // Electrical & Robotics
    { id: "battery", name: "Li-Po Cell", domain: "electrical", type: "battery", color: "#22c55e", defaultWidth: 64, defaultHeight: 38 },
    { id: "led", name: "Status LED", domain: "electrical", type: "led", color: "#f43f5e", defaultWidth: 24, defaultHeight: 24 },
    { id: "switch", name: "Toggle Switch", domain: "electrical", type: "switch", color: "#f97316", defaultWidth: 28, defaultHeight: 28 },
    { id: "sensor", name: "LiDAR Sensor", domain: "robotics", type: "sensor", color: "#14b8a6", defaultWidth: 34, defaultHeight: 34 },
    { id: "robot_arm", name: "Robot Arm Joint", domain: "robotics", type: "robot_arm", color: "#ec4899", defaultWidth: 90, defaultHeight: 30 }
  ];

  constructor() {
    this.saveState();
  }

  setDomain(domain: EngineeringDomain) {
    this.activeDomain = domain;
  }

  snapPoint(x: number, y: number): { x: number; y: number } {
    if (!this.isSnapEnabled) return { x, y };
    return {
      x: Math.round(x / this.gridStep) * this.gridStep,
      y: Math.round(y / this.gridStep) * this.gridStep
    };
  }

  // Find nearest wall for embedding doors or windows
  findNearestWall(x: number, y: number): SpatialCADNode | null {
    for (const node of this.nodes) {
      if (node.type === "wall") {
        const minX = Math.min(node.x1, node.x2) - 20;
        const maxX = Math.max(node.x1, node.x2) + 20;
        const minY = Math.min(node.y1, node.y2) - 20;
        const maxY = Math.max(node.y1, node.y2) + 20;

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

    // Deselect existing
    this.nodes.forEach(n => n.selected = false);

    let newNode: SpatialCADNode;

    if (type === "wall" || type === "pipe" || type === "beam") {
      // Linear stretching component
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
      // Embedded wall component
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
      // Discrete CAD component (Gears, Motors, Columns, Sensors, Batteries)
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
    this.saveState();
    return newNode;
  }

  rotateSelectedNode() {
    if (!this.selectedNodeId) return;
    const node = this.nodes.find(n => n.id === this.selectedNodeId);
    if (node) {
      node.rotation = (node.rotation + 45) % 360;
      this.saveState();
    }
  }

  deleteSelectedNode() {
    if (!this.selectedNodeId) return;
    this.nodes = this.nodes.filter(n => n.id !== this.selectedNodeId);
    this.selectedNodeId = null;
    this.saveState();
  }

  clear() {
    this.nodes = [];
    this.selectedNodeId = null;
    this.activeWallStart = null;
    this.saveState();
  }

  undo() {
    if (this.historyIdx > 0) {
      this.historyIdx--;
      this.nodes = JSON.parse(JSON.stringify(this.history[this.historyIdx]));
    }
  }

  redo() {
    if (this.historyIdx < this.history.length - 1) {
      this.historyIdx++;
      this.nodes = JSON.parse(JSON.stringify(this.history[this.historyIdx]));
    }
  }

  private saveState() {
    if (this.historyIdx < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIdx + 1);
    }
    this.history.push(JSON.parse(JSON.stringify(this.nodes)));
    this.historyIdx = this.history.length - 1;
  }

  // Render Clean Spatial CAD View (Grid visible only during placement/editing)
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cursorPos: { x: number; y: number } | null,
    activeType: ParametricComponent["type"] | null
  ) {
    ctx.save();

    const isPlacing = cursorPos !== null && (activeType !== null || this.activeWallStart !== null);

    // 1. Render Construction Grid ONLY when actively placing or editing
    if (isPlacing) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
      ctx.lineWidth = 1.0;

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
    }

    // 2. Render Parametric CAD Nodes
    this.nodes.forEach(node => {
      ctx.save();

      if (node.type === "wall" || node.type === "pipe" || node.type === "beam") {
        // Render Linear Stretch Component
        ctx.strokeStyle = node.color;
        ctx.lineWidth = node.height;
        ctx.lineCap = "round";
        ctx.shadowBlur = node.selected ? 16 : 6;
        ctx.shadowColor = node.selected ? "#38bdf8" : "rgba(0,0,0,0.4)";

        ctx.beginPath();
        ctx.moveTo(node.x1, node.y1);
        ctx.lineTo(node.x2, node.y2);
        ctx.stroke();

        // White core line
        ctx.strokeStyle = node.selected ? "#ffffff" : "rgba(255,255,255,0.6)";
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Measurement Label
        const midX = (node.x1 + node.x2) / 2;
        const midY = (node.y1 + node.y2) / 2;
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${node.name} (${Math.round(node.width)}mm)`, midX, midY - 10);

      } else {
        // Render Discrete CAD Component (Gears, Motors, Embedded Doors, Windows)
        const cx = (node.x1 + node.x2) / 2;
        const cy = (node.y1 + node.y2) / 2;

        ctx.translate(cx, cy);
        ctx.rotate((node.rotation * Math.PI) / 180);

        ctx.shadowBlur = node.selected ? 20 : 8;
        ctx.shadowColor = node.selected ? "#38bdf8" : "rgba(0,0,0,0.4)";

        ctx.fillStyle = node.color;
        ctx.fillRect(-node.width / 2, -node.height / 2, node.width, node.height);

        ctx.strokeStyle = node.selected ? "#ffffff" : "rgba(255,255,255,0.4)";
        ctx.lineWidth = node.selected ? 2.5 : 1.2;
        ctx.strokeRect(-node.width / 2, -node.height / 2, node.width, node.height);

        // Component Icon/Label
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(node.name, 0, 3);
      }

      ctx.restore();
    });

    // 3. Render Active Wall Stretch Rubberband Line
    if (this.activeWallStart && cursorPos) {
      const p = this.snapPoint(cursorPos.x, cursorPos.y);
      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#38bdf8";
      ctx.globalAlpha = 0.7;

      ctx.beginPath();
      ctx.moveTo(this.activeWallStart.x, this.activeWallStart.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      const len = Math.hypot(p.x - this.activeWallStart.x, p.y - this.activeWallStart.y);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`Stretching Wall: ${Math.round(len)}mm`, (this.activeWallStart.x + p.x) / 2, (this.activeWallStart.y + p.y) / 2 - 12);
      ctx.restore();
    }

    // 4. Render Ghost Preview before placement
    if (cursorPos && activeType && !this.activeWallStart) {
      const p = this.snapPoint(cursorPos.x, cursorPos.y);
      const comp = EngineeringStudioEngine.CATALOG.find(c => c.type === activeType);
      if (comp) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = 0.5;

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
