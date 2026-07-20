import { describe, it, expect } from "vitest";
import { HandwritingSegmenter } from "../src/features/segmenter";
import { Stroke2D } from "../src/types";

describe("HandwritingSegmenter Engine", () => {
  const segmenter = new HandwritingSegmenter();

  it("should segment strokes into basic characters, words, lines, and paragraphs", () => {
    // Generate two words on two separate lines
    // Line 1: Word 1 ("ab") drawn at y=10, Word 2 ("cd") drawn at y=10 with a horizontal gap
    // Line 2: Word 3 ("ef") drawn at y=100 (a line gap)
    
    // Word 1: 'a' stroke, 'b' stroke
    const strokeA: Stroke2D = [{ x: 10, y: 10, t: 100 }, { x: 20, y: 25, t: 150 }];
    const strokeB: Stroke2D = [{ x: 30, y: 10, t: 200 }, { x: 40, y: 25, t: 250 }];
    
    // Word 2: 'c' stroke, 'd' stroke (separated by 60px horizontal space)
    const strokeC: Stroke2D = [{ x: 100, y: 10, t: 400 }, { x: 110, y: 25, t: 450 }];
    const strokeD: Stroke2D = [{ x: 120, y: 10, t: 500 }, { x: 130, y: 25, t: 550 }];

    // Line 2, Word 3: 'e' stroke, 'f' stroke (vertical center around y=100)
    const strokeE: Stroke2D = [{ x: 10, y: 100, t: 1000 }, { x: 20, y: 115, t: 1050 }];
    const strokeF: Stroke2D = [{ x: 30, y: 100, t: 1100 }, { x: 40, y: 115, t: 1150 }];

    const strokes: Stroke2D[] = [strokeA, strokeB, strokeC, strokeD, strokeE, strokeF];
    
    const result = segmenter.segmentDetailed(strokes);

    // Verify lines structure
    expect(result.paragraphs).toHaveLength(1); // Small line spacing of 75px fits single paragraph spacing (130px)
    const paragraph = result.paragraphs[0]!;
    expect(paragraph.lines).toHaveLength(2); // Two separate baselines (y=10 vs y=100)

    const line1 = paragraph.lines[0]!;
    expect(line1.words).toHaveLength(2); // Word 1 ("ab") and Word 2 ("cd") due to 60px horizontal gap (threshold is 55px)

    const line2 = paragraph.lines[1]!;
    expect(line2.words).toHaveLength(1); // Word 3 ("ef")

    // Flat segment method should yield 6 character clusters
    const flatClusters = segmenter.segment(strokes);
    expect(flatClusters).toHaveLength(6);
  });

  it("should handle overlapping strokes (like crossing a 't' or dotting an 'i')", () => {
    // Write letter 'i': shaft stroke, then a dot stroke drawn slightly later that overlaps with the shaft box.
    const shaft: Stroke2D = [{ x: 50, y: 20, t: 100 }, { x: 50, y: 40, t: 150 }];
    const dot: Stroke2D = [{ x: 48, y: 12, t: 300 }, { x: 52, y: 13, t: 320 }]; // Drawn 150ms later, overlaps X coordinates

    const result = segmenter.segmentDetailed([shaft, dot]);

    // Should merge them into a single character representing 'i'
    expect(result.paragraphs[0]!.lines[0]!.words[0]!.characters).toHaveLength(1);
    const character = result.paragraphs[0]!.lines[0]!.words[0]!.characters[0]!;
    expect(character.strokes).toHaveLength(2);
    expect(character.boundingBox.y).toBe(12); // Dot min coordinate
    expect(character.boundingBox.height).toBe(28); // 40 (max y) - 12 (min y)
  });

  it("should handle fast writing (short time gaps) and slow writing (large spatial bounds overlaps)", () => {
    // Fast writing: short time gap (50ms) between strokes that are slightly separated horizontally
    const stroke1: Stroke2D = [{ x: 10, y: 10, t: 100 }, { x: 15, y: 20, t: 120 }];
    const stroke2: Stroke2D = [{ x: 25, y: 10, t: 150 }, { x: 30, y: 20, t: 170 }]; // 30ms gap, 10px horizontal space
    
    // Slow writing: large time gap (1500ms) but overlapping bounds
    const stroke3: Stroke2D = [{ x: 100, y: 10, t: 200 }, { x: 100, y: 30, t: 220 }];
    const stroke4: Stroke2D = [{ x: 98, y: 15, t: 1800 }, { x: 102, y: 16, t: 1820 }]; // 1580ms gap, high horizontal overlap

    const result = segmenter.segmentDetailed([stroke1, stroke2, stroke3, stroke4]);

    // Words count: should split into 2 words
    // Word 1 has 2 characters (stroke1 and stroke2 grouped as distinct characters in same word)
    // Word 2 has 1 character (stroke3 and stroke4 merged into single character due to overlap)
    const word1 = result.paragraphs[0]!.lines[0]!.words[0]!;
    expect(word1.characters).toHaveLength(2);

    const word2 = result.paragraphs[0]!.lines[0]!.words[1]!;
    expect(word2.characters).toHaveLength(1);
    expect(word2.characters[0]!.strokes).toHaveLength(2); // Merged overlapping strokes
  });

  it("should trigger new paragraphs under large vertical spacing or indentations", () => {
    // Line 1: y = 10
    const stroke1: Stroke2D = [{ x: 10, y: 10, t: 100 }, { x: 20, y: 20, t: 150 }];
    // Line 2: y = 200 (180px gap, triggers paragraph spacing threshold of 130px)
    const stroke2: Stroke2D = [{ x: 10, y: 200, t: 1000 }, { x: 20, y: 210, t: 1050 }];

    const result = segmenter.segmentDetailed([stroke1, stroke2]);
    expect(result.paragraphs).toHaveLength(2);
    expect(result.paragraphs[0]!.boundingBox.y).toBe(10);
    expect(result.paragraphs[1]!.boundingBox.y).toBe(200);
  });
});
