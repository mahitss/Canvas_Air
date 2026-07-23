// Voxel Build Engine for VisionCanvas AR Spatial Build Mode

export interface VoxelBlock {
  id: string;
  gridX: number; // Grid Column
  gridY: number; // Grid Row
  gridZ: number; // Layer Depth
  material: "stone" | "glass" | "wood" | "metal" | "neon" | "ice" | "lava";
  color: string;
  scale: number;
  rotation: number; // 0, 90, 180, 270
}

export class VoxelBuildEngine {
  public blocks: VoxelBlock[] = [];
  public selectedMaterial: VoxelBlock["material"] = "neon";
  public gridCellSize = 38; // pixels per isometric voxel cell
  private history: VoxelBlock[][] = [];
  private historyIndex = -1;

  public static MATERIAL_PALETTE: Record<VoxelBlock["material"], { main: string; top: string; side: string; glow: string }> = {
    stone: { main: "#78716c", top: "#a8a29e", side: "#57534e", glow: "#78716c" },
    glass: { main: "rgba(56, 189, 248, 0.6)", top: "rgba(186, 230, 253, 0.8)", side: "rgba(14, 165, 233, 0.5)", glow: "#38bdf8" },
    wood: { main: "#b45309", top: "#d97706", side: "#78350f", glow: "#d97706" },
    metal: { main: "#94a3b8", top: "#cbd5e1", side: "#64748b", glow: "#94a3b8" },
    neon: { main: "#a855f7", top: "#c084fc", side: "#7e22ce", glow: "#c084fc" },
    ice: { main: "rgba(103, 232, 249, 0.7)", top: "rgba(207, 250, 254, 0.9)", side: "rgba(6, 182, 212, 0.6)", glow: "#67e8f9" },
    lava: { main: "#ef4444", top: "#fca5a5", side: "#b91c1c", glow: "#ef4444" }
  };

  constructor() {
    this.saveState();
  }

  setMaterial(material: VoxelBlock["material"]) {
    this.selectedMaterial = material;
  }

  // Snap pixel coordinates (x, y) to spatial 3D/2D Voxel Grid cell (gx, gy)
  snapToGrid(screenX: number, screenY: number, originX: number, originY: number): { gridX: number; gridY: number; screenX: number; screenY: number } {
    const relX = screenX - originX;
    const relY = screenY - originY;

    const gridX = Math.round(relX / this.gridCellSize);
    const gridY = Math.round(relY / this.gridCellSize);

    const snappedX = originX + gridX * this.gridCellSize;
    const snappedY = originY + gridY * this.gridCellSize;

    return { gridX, gridY, screenX: snappedX, screenY: snappedY };
  }

  addBlock(gridX: number, gridY: number, gridZ: number = 0): VoxelBlock {
    // Prevent duplicate block on same cell
    const existing = this.blocks.find(b => b.gridX === gridX && b.gridY === gridY && b.gridZ === gridZ);
    if (existing) return existing;

    const materialInfo = VoxelBuildEngine.MATERIAL_PALETTE[this.selectedMaterial];
    const newBlock: VoxelBlock = {
      id: Math.random().toString(36).substr(2, 9),
      gridX,
      gridY,
      gridZ,
      material: this.selectedMaterial,
      color: materialInfo.main,
      scale: 1.0,
      rotation: 0
    };

    this.blocks.push(newBlock);
    this.saveState();
    return newBlock;
  }

  removeBlock(gridX: number, gridY: number, gridZ: number = 0): boolean {
    const idx = this.blocks.findIndex(b => b.gridX === gridX && b.gridY === gridY && b.gridZ === gridZ);
    if (idx !== -1) {
      this.blocks.splice(idx, 1);
      this.saveState();
      return true;
    }
    return false;
  }

  clear() {
    this.blocks = [];
    this.saveState();
  }

  undo(): boolean {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.blocks = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      return true;
    }
    return false;
  }

  redo(): boolean {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.blocks = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      return true;
    }
    return false;
  }

  private saveState() {
    // Truncate redo history
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(JSON.parse(JSON.stringify(this.blocks)));
    this.historyIndex = this.history.length - 1;
  }

  // Render Voxel Grid & Blocks with Isometric 3D Depth Projection & Material Highlights
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cursorGrid: { gridX: number; gridY: number } | null
  ) {
    const originX = width / 2;
    const originY = height / 2;
    const s = this.gridCellSize;

    ctx.save();

    // 1. Draw Ultra-Subtle Glassmorphic Spatial Grid Guidelines (5% idle opacity, 10% 5th lines)
    const isPlacing = cursorGrid !== null;
    const gridAlpha = isPlacing ? 0.12 : 0.05;

    const gridCols = Math.floor(width / s);
    const gridRows = Math.floor(height / s);

    let colIdx = 0;
    for (let col = -Math.floor(gridCols / 2); col <= Math.floor(gridCols / 2); col++) {
      colIdx++;
      const isFifth = colIdx % 5 === 0;
      const x = originX + col * s;
      ctx.strokeStyle = isFifth
        ? `rgba(255, 255, 255, ${gridAlpha * 2.0})`
        : `rgba(255, 255, 255, ${gridAlpha})`;
      ctx.lineWidth = isFifth ? 0.8 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    let rowIdx = 0;
    for (let row = -Math.floor(gridRows / 2); row <= Math.floor(gridRows / 2); row++) {
      rowIdx++;
      const isFifth = rowIdx % 5 === 0;
      const y = originY + row * s;
      ctx.strokeStyle = isFifth
        ? `rgba(255, 255, 255, ${gridAlpha * 2.0})`
        : `rgba(255, 255, 255, ${gridAlpha})`;
      ctx.lineWidth = isFifth ? 0.8 : 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Sort blocks by depth for proper isometric rendering order
    const sortedBlocks = [...this.blocks].sort((a, b) => (a.gridY - b.gridY) || (a.gridX - b.gridX));

    // 2. Render Placed Voxel Blocks
    sortedBlocks.forEach(block => {
      const px = originX + block.gridX * s;
      const py = originY + block.gridY * s;
      const mat = VoxelBuildEngine.MATERIAL_PALETTE[block.material];

      // Draw Voxel Cube Face (Isometric 3D block representation)
      ctx.save();
      ctx.shadowBlur = block.material === "neon" ? 18 : 8;
      ctx.shadowColor = mat.glow;

      // Front Face
      ctx.fillStyle = mat.main;
      ctx.fillRect(px - s / 2, py - s / 2, s - 2, s - 2);

      // Top Bevel Highlight
      ctx.fillStyle = mat.top;
      ctx.beginPath();
      ctx.moveTo(px - s / 2, py - s / 2);
      ctx.lineTo(px + s / 2 - 2, py - s / 2);
      ctx.lineTo(px + s / 2 - 6, py - s / 2 + 5);
      ctx.lineTo(px - s / 2 + 4, py - s / 2 + 5);
      ctx.closePath();
      ctx.fill();

      // Side Bevel Highlight
      ctx.fillStyle = mat.side;
      ctx.beginPath();
      ctx.moveTo(px + s / 2 - 2, py - s / 2);
      ctx.lineTo(px + s / 2 - 2, py + s / 2 - 2);
      ctx.lineTo(px + s / 2 - 6, py + s / 2 - 6);
      ctx.lineTo(px + s / 2 - 6, py - s / 2 + 5);
      ctx.closePath();
      ctx.fill();

      // Border outline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1.0;
      ctx.strokeRect(px - s / 2, py - s / 2, s - 2, s - 2);

      ctx.restore();
    });

    // 3. Render Ghost Preview Block under Fingertip Cursor
    if (cursorGrid) {
      const gx = originX + cursorGrid.gridX * s;
      const gy = originY + cursorGrid.gridY * s;
      const mat = VoxelBuildEngine.MATERIAL_PALETTE[this.selectedMaterial];

      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.shadowBlur = 15;
      ctx.shadowColor = mat.glow;
      ctx.fillStyle = mat.main;
      ctx.fillRect(gx - s / 2, gy - s / 2, s - 2, s - 2);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.0;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(gx - s / 2, gy - s / 2, s - 2, s - 2);
      ctx.restore();
    }

    ctx.restore();
  }
}
