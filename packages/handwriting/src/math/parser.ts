import { BoundingBox } from "../types";

export interface MathSymbolNode {
  char: string;
  boundingBox: BoundingBox;
}

/**
 * Math Recognition Parser that translates spatial character coordinates into LaTeX representations.
 * Handles numbers, operators, fractions, roots (including degree roots), matrices, Greek symbols, superscripts, and subscripts.
 */
export class MathParser {
  private static readonly LINE_HEIGHT_DIFF = 35.0; // px
  private static readonly COL_SPACE_DIFF = 20.0;  // px

  public static parseSymbolsToLatex(symbols: MathSymbolNode[]): string {
    if (symbols.length === 0) return "";

    let remaining = [...symbols];

    // 1. Identify and Parse Matrices
    remaining = this.extractAndParseMatrices(remaining);

    // 2. Identify and Parse Roots
    remaining = this.extractAndParseRoots(remaining);

    // 3. Identify and Parse Fractions
    remaining = this.extractAndParseFractions(remaining);

    // 4. Sort remaining elements horizontally for linear flow
    remaining.sort((a, b) => a.boundingBox.x - b.boundingBox.x);

    // 5. Parse Superscripts and Subscripts
    let result = "";
    for (let i = 0; i < remaining.length; i++) {
      const base = remaining[i]!;

      // Check if next elements are superscripts or subscripts of the current base
      const superscripts: MathSymbolNode[] = [];
      const subscripts: MathSymbolNode[] = [];

      let nextIdx = i + 1;
      while (nextIdx < remaining.length) {
        const next = remaining[nextIdx]!;
        
        // Horizontal distance constraint (must be adjacent)
        const gap = next.boundingBox.x - (base.boundingBox.x + base.boundingBox.width);
        if (gap > 60) break;

        const isSuper = next.boundingBox.y + next.boundingBox.height < base.boundingBox.y + base.boundingBox.height * 0.4;
        const isSub = next.boundingBox.y > base.boundingBox.y + base.boundingBox.height * 0.6;

        if (isSuper) {
          superscripts.push(next);
          nextIdx++;
        } else if (isSub) {
          subscripts.push(next);
          nextIdx++;
        } else {
          break;
        }
      }

      result += base.char;

      if (superscripts.length > 0) {
        const superLatex = this.parseSymbolsToLatex(superscripts);
        result += `^{${superLatex}}`;
        i += superscripts.length;
      }
      if (subscripts.length > 0) {
        const subLatex = this.parseSymbolsToLatex(subscripts);
        result += `_{${subLatex}}`;
        i += subscripts.length;
      }
    }

    return result;
  }

  private static extractAndParseMatrices(symbols: MathSymbolNode[]): MathSymbolNode[] {
    const leftBrackets = symbols.filter(s => s.char === "[" || s.char === "\\lbrack");
    const rightBrackets = symbols.filter(s => s.char === "]" || s.char === "\\rbrack");

    if (leftBrackets.length === 0 || rightBrackets.length === 0) {
      return symbols;
    }

    let remaining = [...symbols];

    for (const left of leftBrackets) {
      // Find matching right bracket to the right of left bracket
      const matchingRight = rightBrackets.find(r => r.boundingBox.x > left.boundingBox.x);
      if (!matchingRight) continue;

      // Extract all internal symbols horizontally contained between brackets
      const internalSymbols = remaining.filter(s => 
        s !== left && 
        s !== matchingRight &&
        s.boundingBox.x > left.boundingBox.x + left.boundingBox.width * 0.2 &&
        s.boundingBox.x + s.boundingBox.width < matchingRight.boundingBox.x + matchingRight.boundingBox.width * 0.8
      );

      if (internalSymbols.length === 0) continue;

      // Group internal symbols into matrix rows (Y coordinate clusters)
      const rows: MathSymbolNode[][] = [];
      const sortedByY = [...internalSymbols].sort((a, b) => a.boundingBox.y - b.boundingBox.y);

      for (const item of sortedByY) {
        let placed = false;
        for (const row of rows) {
          const rowCenterY = row.reduce((sum, e) => sum + (e.boundingBox.y + e.boundingBox.height / 2), 0) / row.length;
          const itemCenterY = item.boundingBox.y + item.boundingBox.height / 2;
          if (Math.abs(itemCenterY - rowCenterY) < this.LINE_HEIGHT_DIFF) {
            row.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) {
          rows.push([item]);
        }
      }

      // Sort rows vertically
      rows.sort((a, b) => {
        const ay = a.reduce((sum, e) => sum + e.boundingBox.y, 0) / a.length;
        const by = b.reduce((sum, e) => sum + e.boundingBox.y, 0) / b.length;
        return ay - by;
      });

      // Matrix is valid if we have multiple rows or multiple elements in a row
      const isMatrix = rows.length > 1 || (rows[0] && rows[0].length > 1);
      if (!isMatrix) continue;

      // Build LaTeX matrix contents: row cells are separated by '&', rows by '\\'
      const rowStrings: string[] = [];
      for (const row of rows) {
        // Group row elements into columns horizontally
        row.sort((a, b) => a.boundingBox.x - b.boundingBox.x);
        
        const cols: MathSymbolNode[][] = [];
        for (const item of row) {
          let placed = false;
          for (const col of cols) {
            const last = col[col.length - 1]!;
            const gap = item.boundingBox.x - (last.boundingBox.x + last.boundingBox.width);
            if (gap < this.COL_SPACE_DIFF) {
              col.push(item);
              placed = true;
              break;
            }
          }
          if (!placed) {
            cols.push([item]);
          }
        }

        const colStrings = cols.map(col => this.parseSymbolsToLatex(col));
        rowStrings.push(colStrings.join(" & "));
      }

      const matrixLatex = `\\begin{matrix} ${rowStrings.join(" \\\\ ")} \\end{matrix}`;
      
      // Replace matrix bracket boundaries and internal nodes in remaining list with a single synthesized Node
      const combinedBbox = {
        x: left.boundingBox.x,
        y: Math.min(left.boundingBox.y, matchingRight.boundingBox.y),
        width: (matchingRight.boundingBox.x + matchingRight.boundingBox.width) - left.boundingBox.x,
        height: Math.max(left.boundingBox.height, matchingRight.boundingBox.height)
      };

      remaining = remaining.filter(s => 
        s !== left && 
        s !== matchingRight && 
        !internalSymbols.includes(s)
      );

      remaining.push({
        char: matrixLatex,
        boundingBox: combinedBbox
      });
    }

    return remaining;
  }

  private static extractAndParseRoots(symbols: MathSymbolNode[]): MathSymbolNode[] {
    const roots = symbols.filter(s => s.char === "\\sqrt" || s.char === "sqrt");
    if (roots.length === 0) {
      return symbols;
    }

    let remaining = [...symbols];

    for (const root of roots) {
      // Find degree symbol: small symbol to the top-left of the root box
      const degreeNodes = remaining.filter(s =>
        s !== root &&
        s.boundingBox.x < root.boundingBox.x + root.boundingBox.width * 0.2 &&
        s.boundingBox.x >= root.boundingBox.x - 30 &&
        s.boundingBox.y < root.boundingBox.y + root.boundingBox.height * 0.4
      );

      // Find argument nodes: symbols horizontally and vertically inside the root's span
      const argumentNodes = remaining.filter(s =>
        s !== root &&
        !degreeNodes.includes(s) &&
        s.boundingBox.x >= root.boundingBox.x + root.boundingBox.width * 0.1 &&
        s.boundingBox.x <= root.boundingBox.x + root.boundingBox.width * 1.8 &&
        s.boundingBox.y >= root.boundingBox.y - 30 &&
        s.boundingBox.y <= root.boundingBox.y + root.boundingBox.height + 30
      );

      if (argumentNodes.length === 0) continue;

      const argLatex = this.parseSymbolsToLatex(argumentNodes);
      let rootLatex = "";

      if (degreeNodes.length > 0) {
        const degLatex = this.parseSymbolsToLatex(degreeNodes);
        rootLatex = `\\sqrt[${degLatex}]{${argLatex}}`;
      } else {
        rootLatex = `\\sqrt{${argLatex}}`;
      }

      // Replace root nodes in remaining list
      remaining = remaining.filter(s => 
        s !== root && 
        !degreeNodes.includes(s) && 
        !argumentNodes.includes(s)
      );

      remaining.push({
        char: rootLatex,
        boundingBox: root.boundingBox
      });
    }

    return remaining;
  }

  private static extractAndParseFractions(symbols: MathSymbolNode[]): MathSymbolNode[] {
    // Fraction division bars: horizontal lines longer than 15px
    const bars = symbols.filter(s => s.char === "-" && s.boundingBox.width > 15 && s.boundingBox.width > 2.0 * s.boundingBox.height);
    if (bars.length === 0) {
      return symbols;
    }

    let remaining = [...symbols];

    // Process from longest bar downwards to handle nested fractions properly
    bars.sort((a, b) => b.boundingBox.width - a.boundingBox.width);

    for (const bar of bars) {
      if (!remaining.includes(bar)) continue;

      // Extract numerator and denominator nodes relative to bar boundary
      const numeratorNodes = remaining.filter(s =>
        s !== bar &&
        s.boundingBox.x + s.boundingBox.width >= bar.boundingBox.x &&
        s.boundingBox.x <= bar.boundingBox.x + bar.boundingBox.width &&
        s.boundingBox.y + s.boundingBox.height * 0.8 < bar.boundingBox.y
      );

      const denominatorNodes = remaining.filter(s =>
        s !== bar &&
        s.boundingBox.x + s.boundingBox.width >= bar.boundingBox.x &&
        s.boundingBox.x <= bar.boundingBox.x + bar.boundingBox.width &&
        s.boundingBox.y + s.boundingBox.height * 0.2 > bar.boundingBox.y
      );

      if (numeratorNodes.length > 0 && denominatorNodes.length > 0) {
        const numLatex = this.parseSymbolsToLatex(numeratorNodes);
        const denLatex = this.parseSymbolsToLatex(denominatorNodes);
        const fracLatex = `\\frac{${numLatex}}{${denLatex}}`;

        remaining = remaining.filter(s => 
          s !== bar && 
          !numeratorNodes.includes(s) && 
          !denominatorNodes.includes(s)
        );

        remaining.push({
          char: fracLatex,
          boundingBox: bar.boundingBox
        });
      }
    }

    return remaining;
  }
}
