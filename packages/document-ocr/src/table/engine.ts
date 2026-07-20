import { TextRegion, TableStructure, TableCell } from "../types";

export class TableEngine {
  private cellDeltaX = 40;
  private cellDeltaY = 20;

  /**
   * Sorts coordinate text boxes into aligned row/column tables matrix, identifying merged cells and headers.
   */
  public extractTables(regions: TextRegion[]): TableStructure[] {
    if (regions.length < 4) return [];

    // 1. Group rows based on similar Y boundaries
    const rowsMap = new Map<number, TextRegion[]>();

    for (const reg of regions) {
      let matchedYKey: number | null = null;
      for (const existingY of rowsMap.keys()) {
        if (Math.abs(reg.y - existingY) < this.cellDeltaY) {
          matchedYKey = existingY;
          break;
        }
      }

      if (matchedYKey !== null) {
        rowsMap.get(matchedYKey)!.push(reg);
      } else {
        rowsMap.set(reg.y, [reg]);
      }
    }

    const sortedRowYKeys = Array.from(rowsMap.keys()).sort((a, b) => a - b);
    if (sortedRowYKeys.length < 2) return [];

    // 2. Identify columns based on X boundaries
    const colsSet = new Set<number>();
    for (const key of sortedRowYKeys) {
      const rowRegions = rowsMap.get(key) || [];
      for (const reg of rowRegions) {
        let matchedXKey = reg.x;
        for (const existingX of colsSet) {
          if (Math.abs(reg.x - existingX) < this.cellDeltaX) {
            matchedXKey = existingX;
            break;
          }
        }
        colsSet.add(matchedXKey);
      }
    }

    const sortedColXKeys = Array.from(colsSet).sort((a, b) => a - b);
    if (sortedColXKeys.length < 2) return [];

    const cells: TableCell[] = [];
    const headers: string[] = [];

    // Heuristics: first row contains headers
    const headerRowY = sortedRowYKeys[0]!;
    const headerRegions = rowsMap.get(headerRowY) || [];
    headerRegions.sort((a, b) => a.x - b.x);
    for (const r of headerRegions) {
      headers.push(r.text);
    }

    for (let r = 0; r < sortedRowYKeys.length; r++) {
      const rowY = sortedRowYKeys[r]!;
      const rowRegions = rowsMap.get(rowY) || [];

      for (let c = 0; c < sortedColXKeys.length; c++) {
        const colX = sortedColXKeys[c]!;

        const cellRegion = rowRegions.find(
          reg => Math.abs(reg.x - colX) < this.cellDeltaX
        );

        if (cellRegion) {
          // If cell is significantly wider than standard column width, flag it as merged
          const isMerged = cellRegion.w > (this.cellDeltaX * 3);
          cells.push({
            r,
            c,
            text: cellRegion.text,
            merged: isMerged
          });
        }
      }
    }

    return [
      {
        rows: sortedRowYKeys.length,
        cols: sortedColXKeys.length,
        cells,
        headers
      }
    ];
  }
}
