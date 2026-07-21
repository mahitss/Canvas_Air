// Engineering Studio Engine for VisionCanvas AR
// Full Spatial CAD & AR Engineering Workspace Engine

export type EngineeringDomain = "architecture" | "civil" | "mechanical" | "electrical" | "robotics" | "general";

export interface ComponentMetadata {
  id: string;
  name: string;
  domain: EngineeringDomain;
  category: string;
  color: string;
  width: number;
  height: number;
  depth: number;
  material: string;
}

export interface SpatialEngineeringNode {
  id: string;
  componentId: string;
  name: string;
  domain: EngineeringDomain;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  color: string;
  material: string;
  rotation: number; // degrees 0, 45, 90, 180
  scale: number;
  selected: boolean;
}

export class EngineeringStudioEngine {
  public activeDomain: EngineeringDomain = "architecture";
  public nodes: SpatialEngineeringNode[] = [];
  public selectedNodeId: string | null = null;
  public gridStep = 30; // 30px grid snap
  public isSnapEnabled = true;
  public isPhysicsEnabled = false;

  private history: SpatialEngineeringNode[][] = [];
  private historyIdx = -1;

  // Component Catalog Registry
  public static COMPONENT_CATALOG: ComponentMetadata[] = [
    // Architecture
    { id: "arch_wall", name: "Wall Panel", domain: "architecture", category: "Walls", color: "#64748b", width: 90, height: 60, depth: 10, material: "Concrete" },
    { id: "arch_column", name: "Support Column", domain: "architecture", category: "Columns", color: "#334155", width: 24, height: 90, depth: 24, material: "Steel" },
    { id: "arch_window", name: "Glass Window", domain: "architecture", category: "Windows", color: "#38bdf8", width: 45, height: 45, depth: 8, material: "Glass" },
    { id: "arch_door", name: "Door Frame", domain: "architecture", category: "Doors", color: "#b45309", width: 40, height: 75, depth: 10, material: "Wood" },
    { id: "arch_roof", name: "Truss Roof", domain: "architecture", category: "Roofs", color: "#ef4444", width: 100, height: 40, depth: 10, material: "Composite" },
    
    // Mechanical
    { id: "mech_gear", name: "Spur Gear", domain: "mechanical", category: "Gears", color: "#eab308", width: 50, height: 50, depth: 15, material: "Brass" },
    { id: "mech_motor", name: "Stepper Motor", domain: "mechanical", category: "Motors", color: "#a855f7", width: 45, height: 45, depth: 40, material: "Aluminum" },
    { id: "mech_pipe", name: "Hydraulic Pipe", domain: "mechanical", category: "Pipes", color: "#06b6d4", width: 80, height: 20, depth: 20, material: "Steel" },
    
    // Electrical
    { id: "elec_battery", name: "Li-Po Battery", domain: "electrical", category: "Power", color: "#22c55e", width: 60, height: 35, depth: 20, material: "Lithium" },
    { id: "elec_switch", name: "Toggle Switch", domain: "electrical", category: "Switches", color: "#f97316", width: 25, height: 25, depth: 20, material: "Plastic" },
    { id: "elec_micro", name: "MCU Board", domain: "electrical", category: "Logic", color: "#10b981", width: 65, height: 45, depth: 10, material: "FR4" },

    // Robotics
    { id: "robot_servo", name: "Servo Motor", domain: "robotics", category: "Actuators", color: "#ec4899", width: 35, height: 40, depth: 20, material: "Alloy" },
    { id: "robot_wheel", name: "Omni Wheel", domain: "robotics", category: "Drivetrain", color: "#6366f1", width: 45, height: 45, depth: 15, material: "Rubber" },
    { id: "robot_sensor", name: "LiDAR Sensor", domain: "robotics", category: "Sensors", color: "#14b8a6", width: 30, height: 30, depth: 30, material: "Optical" }
  ];

  constructor() {
    this.saveState();
  }

  setDomain(domain: EngineeringDomain) {
    this.activeDomain = domain;
  }

  // Snap coordinate (x, y) to spatial grid
  snapCoordinate(x: number, y: number): { x: number; y: number } {
    if (!this.isSnapEnabled) return { x, y };
    const sx = Math.round(x / this.gridStep) * this.gridStep;
    const sy = Math.round(y / this.gridStep) * this.gridStep;
    return { x: sx, y: sy };
  }

  addComponent(componentId: string, screenX: number, screenY: number): SpatialEngineeringNode | null {
    const comp = EngineeringStudioEngine.COMPONENT_CATALOG.find(c => c.id === componentId);
    if (!comp) return null;

    const snapped = this.snapCoordinate(screenX, screenY);
    const newNode: SpatialEngineeringNode = {
      id: Math.random().toString(36).substring(2, 9),
      componentId: comp.id,
      name: comp.name,
      domain: comp.domain,
      x: snapped.x,
      y: snapped.y,
      z: 0,
      width: comp.width,
      height: comp.height,
      color: comp.color,
      material: comp.material,
      rotation: 0,
      scale: 1.0,
      selected: true
    };

    // Deselect existing
    this.nodes.forEach(n => n.selected = false);
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

  // AI Assistant Assembly Generation
  generateAIScene(prompt: string, screenCenterX: number, screenCenterY: number) {
    this.clear();
    const query = prompt.toLowerCase();

    if (query.includes("house") || query.includes("building") || query.includes("architect")) {
      // Build 2-floor structure
      this.addComponent("arch_wall", screenCenterX - 80, screenCenterY);
      this.addComponent("arch_wall", screenCenterX + 80, screenCenterY);
      this.addComponent("arch_door", screenCenterX, screenCenterY);
      this.addComponent("arch_window", screenCenterX - 50, screenCenterY - 60);
      this.addComponent("arch_window", screenCenterX + 50, screenCenterY - 60);
      this.addComponent("arch_roof", screenCenterX, screenCenterY - 120);
    } else if (query.includes("robot") || query.includes("chassis")) {
      // Build Robotic Chassis
      this.addComponent("elec_micro", screenCenterX, screenCenterY);
      this.addComponent("robot_servo", screenCenterX - 60, screenCenterY);
      this.addComponent("robot_servo", screenCenterX + 60, screenCenterY);
      this.addComponent("robot_wheel", screenCenterX - 70, screenCenterY + 40);
      this.addComponent("robot_wheel", screenCenterX + 70, screenCenterY + 40);
      this.addComponent("robot_sensor", screenCenterX, screenCenterY - 50);
    } else {
      // Default Mechanical Assembly
      this.addComponent("mech_motor", screenCenterX - 60, screenCenterY);
      this.addComponent("mech_gear", screenCenterX, screenCenterY);
      this.addComponent("mech_gear", screenCenterX + 55, screenCenterY);
    }
  }

  // OBJ Exporter
  exportToOBJ(): string {
    let obj = "# VisionCanvas AR Spatial Engineering OBJ Export\n";
    let vCount = 1;

    this.nodes.forEach(node => {
      obj += `\no ${node.name}_${node.id}\n`;
      const hw = node.width / 2;
      const hh = node.height / 2;

      // 8 Vertices for node box
      obj += `v ${node.x - hw} ${node.y - hh} 0\n`;
      obj += `v ${node.x + hw} ${node.y - hh} 0\n`;
      obj += `v ${node.x + hw} ${node.y + hh} 0\n`;
      obj += `v ${node.x - hw} ${node.y + hh} 0\n`;

      obj += `f ${vCount} ${vCount + 1} ${vCount + 2} ${vCount + 3}\n`;
      vCount += 4;
    });

    return obj;
  }

  // Render Spatial CAD Canvas
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cursorPos: { x: number; y: number } | null,
    activeComponentId: string | null
  ) {
    ctx.save();

    // 1. Draw Architectural Grid
    ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
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

    // 2. Render Engineering Components
    this.nodes.forEach(node => {
      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.rotate((node.rotation * Math.PI) / 180);

      // Node Shadow
      ctx.shadowBlur = node.selected ? 22 : 10;
      ctx.shadowColor = node.selected ? "#38bdf8" : "rgba(0,0,0,0.5)";

      // Component Solid Rect
      ctx.fillStyle = node.color;
      ctx.fillRect(-node.width / 2, -node.height / 2, node.width, node.height);

      // Border & Selection Highlight
      ctx.strokeStyle = node.selected ? "#ffffff" : "rgba(255,255,255,0.4)";
      ctx.lineWidth = node.selected ? 2.5 : 1.2;
      ctx.strokeRect(-node.width / 2, -node.height / 2, node.width, node.height);

      // Component Label & Material Metadata
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(node.name, 0, -2);

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "8px sans-serif";
      ctx.fillText(`${node.material} | ${node.width}x${node.height}mm`, 0, 10);

      ctx.restore();
    });

    // 3. Render Ghost Placement Cursor
    if (cursorPos && activeComponentId) {
      const comp = EngineeringStudioEngine.COMPONENT_CATALOG.find(c => c.id === activeComponentId);
      if (comp) {
        const snapped = this.snapCoordinate(cursorPos.x, cursorPos.y);
        ctx.save();
        ctx.translate(snapped.x, snapped.y);
        ctx.globalAlpha = 0.55;

        ctx.fillStyle = comp.color;
        ctx.fillRect(-comp.width / 2, -comp.height / 2, comp.width, comp.height);

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.0;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-comp.width / 2, -comp.height / 2, comp.width, comp.height);

        // Alignment Target Marker
        ctx.setLineDash([]);
        ctx.strokeStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    }

    ctx.restore();
  }
}
