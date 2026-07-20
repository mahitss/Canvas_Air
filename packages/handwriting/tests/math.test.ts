import { describe, it, expect } from "vitest";
import { MathParser, MathSymbolNode } from "../src/math/parser";

describe("Mathematical Handwriting Parser", () => {
  it("should parse standard fraction equations", () => {
    // Equation: 1 / 2 (numerator 1, fraction bar -, denominator 2)
    const symbols: MathSymbolNode[] = [
      { char: "1", boundingBox: { x: 10, y: 10, width: 10, height: 20 } },
      { char: "-", boundingBox: { x: 5, y: 40, width: 30, height: 5 } }, // Fraction bar
      { char: "2", boundingBox: { x: 12, y: 55, width: 12, height: 22 } }
    ];

    const latex = MathParser.parseSymbolsToLatex(symbols);
    expect(latex).toBe("\\frac{1}{2}");
  });

  it("should parse square roots and degree roots", () => {
    // 1. Square root of x
    const sqrtSymbols: MathSymbolNode[] = [
      { char: "\\sqrt", boundingBox: { x: 20, y: 30, width: 15, height: 40 } },
      { char: "x", boundingBox: { x: 38, y: 40, width: 15, height: 20 } }
    ];
    expect(MathParser.parseSymbolsToLatex(sqrtSymbols)).toBe("\\sqrt{x}");

    // 2. Cube root of y (degree 3, root, argument y)
    const cubeRootSymbols: MathSymbolNode[] = [
      { char: "3", boundingBox: { x: 12, y: 25, width: 10, height: 15 } }, // Degree
      { char: "\\sqrt", boundingBox: { x: 25, y: 30, width: 15, height: 40 } },
      { char: "y", boundingBox: { x: 42, y: 40, width: 15, height: 20 } }
    ];
    expect(MathParser.parseSymbolsToLatex(cubeRootSymbols)).toBe("\\sqrt[3]{y}");
  });

  it("should parse matrices grids", () => {
    // Matrix [ 1 2 ; 3 4 ]
    // Row 1: 1 (x=20, y=10), 2 (x=60, y=10)
    // Row 2: 3 (x=20, y=55), 4 (x=60, y=55)
    // Brackets: [ (x=5, y=5), ] (x=90, y=5)
    const matrixSymbols: MathSymbolNode[] = [
      { char: "[", boundingBox: { x: 5, y: 5, width: 10, height: 80 } },
      { char: "1", boundingBox: { x: 25, y: 15, width: 12, height: 20 } },
      { char: "2", boundingBox: { x: 65, y: 15, width: 12, height: 20 } },
      { char: "3", boundingBox: { x: 25, y: 60, width: 12, height: 20 } },
      { char: "4", boundingBox: { x: 65, y: 60, width: 12, height: 20 } },
      { char: "]", boundingBox: { x: 90, y: 5, width: 10, height: 80 } }
    ];

    const latex = MathParser.parseSymbolsToLatex(matrixSymbols);
    expect(latex).toBe("\\begin{matrix} 1 & 2 \\\\ 3 & 4 \\end{matrix}");
  });

  it("should parse superscripts and subscripts indices", () => {
    // Expression: x^2 + y_i
    const symbols: MathSymbolNode[] = [
      { char: "x", boundingBox: { x: 10, y: 30, width: 15, height: 25 } },
      { char: "2", boundingBox: { x: 28, y: 15, width: 10, height: 15 } }, // superscript 2
      { char: "+", boundingBox: { x: 45, y: 35, width: 15, height: 15 } },
      { char: "y", boundingBox: { x: 65, y: 30, width: 15, height: 25 } },
      { char: "i", boundingBox: { x: 83, y: 50, width: 8, height: 15 } }   // subscript i
    ];

    const latex = MathParser.parseSymbolsToLatex(symbols);
    expect(latex).toBe("x^{2}+y_{i}");
  });

  it("should parse equations combining operators and Greek symbols", () => {
    // Expression: \alpha + \beta = \pi
    const symbols: MathSymbolNode[] = [
      { char: "\\alpha", boundingBox: { x: 10, y: 20, width: 15, height: 20 } },
      { char: "+", boundingBox: { x: 35, y: 22, width: 15, height: 15 } },
      { char: "\\beta", boundingBox: { x: 60, y: 20, width: 15, height: 20 } },
      { char: "=", boundingBox: { x: 85, y: 25, width: 15, height: 10 } },
      { char: "\\pi", boundingBox: { x: 110, y: 20, width: 18, height: 18 } }
    ];

    const latex = MathParser.parseSymbolsToLatex(symbols);
    expect(latex).toBe("\\alpha+\\beta=\\pi");
  });
});
