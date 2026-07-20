import { IHandwritingSegmenter } from "../interfaces";
import { Stroke2D, BoundingBox, DetailedSegmentationResult, SegmentedCharacter, SegmentedWord, SegmentedLine, SegmentedParagraph } from "../types";

export interface SegmenterConfig {
  characterOverlapThreshold?: number; // 0.0 - 1.0 (bounding box intersection percentage)
  characterDistanceThreshold?: number; // max horizontal distance between character strokes (px)
  characterTimeGapThreshold?: number; // max pause between character strokes (ms)
  wordDistanceThreshold?: number; // horizontal space indicating word gap (px)
  wordTimeGapThreshold?: number; // pause indicating word space (ms)
  lineCenterDiffThreshold?: number; // max vertical deviation for same line (px)
  paragraphSpacingThreshold?: number; // line spacing triggering paragraph separation (px)
}

/**
 * Segmentation Engine that groups raw strokes into hierarchical Characters, Words, Lines, and Paragraphs.
 * Accounts for fast/slow writing speeds, overlapping strokes (dots/crossings), and layout separations.
 */
export class HandwritingSegmenter implements IHandwritingSegmenter {
  private readonly config: Required<SegmenterConfig>;

  constructor(config?: SegmenterConfig) {
    this.config = {
      characterOverlapThreshold: config?.characterOverlapThreshold ?? 0.25,
      characterDistanceThreshold: config?.characterDistanceThreshold ?? 20,
      characterTimeGapThreshold: config?.characterTimeGapThreshold ?? 400,
      wordDistanceThreshold: config?.wordDistanceThreshold ?? 55,
      wordTimeGapThreshold: config?.wordTimeGapThreshold ?? 900,
      lineCenterDiffThreshold: config?.lineCenterDiffThreshold ?? 60,
      paragraphSpacingThreshold: config?.paragraphSpacingThreshold ?? 130
    };
  }

  /**
   * Groups strokes into simple Stroke2D groups representing distinct text characters.
   */
  public segment(strokes: Stroke2D[]): Stroke2D[][] {
    const detailed = this.segmentDetailed(strokes);
    const result: Stroke2D[][] = [];
    for (const p of detailed.paragraphs) {
      for (const l of p.lines) {
        for (const w of l.words) {
          for (const c of w.characters) {
            result.push(c.strokes);
          }
        }
      }
    }
    return result;
  }

  /**
   * Hierarchically segments strokes into Characters, Words, Lines, and Paragraphs.
   */
  public segmentDetailed(strokes: Stroke2D[]): DetailedSegmentationResult {
    if (strokes.length === 0) {
      return { paragraphs: [] };
    }

    // 1. Enrich strokes with spatial and temporal metadata
    const enriched = strokes.map(stroke => {
      const bbox = this.getStrokeBoundingBox(stroke);
      const startT = stroke[0]?.t ?? 0;
      const endT = stroke[stroke.length - 1]?.t ?? startT;
      const centroid = {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2
      };
      return { stroke, bbox, startT, endT, centroid };
    });

    // 2. Baseline grouping (group strokes into lines based on Y coordinate centers closeness)
    // Sort strokes by Y centroid first
    const strokesSortedByY = [...enriched].sort((a, b) => a.centroid.y - b.centroid.y);
    const lineStrokesGroups: typeof enriched[] = [];

    for (const item of strokesSortedByY) {
      let placed = false;
      for (const group of lineStrokesGroups) {
        // Average Y of the group
        const groupCenterY = group.reduce((sum, e) => sum + e.centroid.y, 0) / group.length;
        if (Math.abs(item.centroid.y - groupCenterY) < this.config.lineCenterDiffThreshold) {
          group.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        lineStrokesGroups.push([item]);
      }
    }

    // Sort the lines vertically by average Y coordinate
    lineStrokesGroups.sort((a, b) => {
      const ay = a.reduce((sum, e) => sum + e.centroid.y, 0) / a.length;
      const by = b.reduce((sum, e) => sum + e.centroid.y, 0) / b.length;
      return ay - by;
    });

    const segmentedLines: SegmentedLine[] = [];

    // Process each line group
    for (const group of lineStrokesGroups) {
      // Sort group strokes horizontally (left-to-right)
      group.sort((a, b) => a.centroid.x - b.centroid.x);

      // Character grouping within the line
      const lineCharacters: SegmentedCharacter[] = [];
      for (const item of group) {
        let merged = false;
        
        // Check lookback characters to see if we can merge (overlapping or tight time/space gap)
        // Check up to 3 lookback characters to handle crossed 't' or dotted 'i' drawn slightly later
        const lookback = Math.max(0, lineCharacters.length - 3);
        for (let c = lineCharacters.length - 1; c >= lookback; c--) {
          const char = lineCharacters[c]!;
          const overlap = this.getIntersectionOverMinArea(item.bbox, char.boundingBox);
          const horizontalGap = Math.max(0, item.bbox.x - (char.boundingBox.x + char.boundingBox.width), char.boundingBox.x - (item.bbox.x + item.bbox.width));
          const verticalGap = Math.max(0, item.bbox.y - (char.boundingBox.y + char.boundingBox.height), char.boundingBox.y - (item.bbox.y + item.bbox.height));
          
          const timeGap = item.startT - (item.startT > 0 ? (char.strokes[0]![0]?.t ?? 0) : 0);
          const isFastTimeGap = timeGap < this.config.characterTimeGapThreshold;

          // Merge if bounding boxes overlap significantly, or if they are horizontally overlapping/touching and drawn quickly, or close vertical accents (like dotting i)
          if (overlap >= this.config.characterOverlapThreshold || 
              (overlap > 0.05 && isFastTimeGap) ||
              (horizontalGap < 10 && verticalGap < 30 && isFastTimeGap)) {
            char.strokes.push(item.stroke);
            char.boundingBox = this.mergeBoundingBoxes(char.boundingBox, item.bbox);
            merged = true;
            break;
          }
        }

        if (!merged) {
          lineCharacters.push({
            strokes: [item.stroke],
            boundingBox: item.bbox
          });
        }
      }

      // Word grouping within the line
      const lineWords: SegmentedWord[] = [];
      if (lineCharacters.length > 0) {
        let currentWord: SegmentedCharacter[] = [lineCharacters[0]!];

        for (let i = 1; i < lineCharacters.length; i++) {
          const prev = lineCharacters[i - 1]!;
          const curr = lineCharacters[i]!;

          const horizontalGap = curr.boundingBox.x - (prev.boundingBox.x + prev.boundingBox.width);
          const prevEndT = prev.strokes[prev.strokes.length - 1]![prev.strokes[prev.strokes.length - 1]!.length - 1]?.t ?? 0;
          const currStartT = curr.strokes[0]![0]?.t ?? 0;
          const timeGap = currStartT - prevEndT;

          const isNewWord = 
            (horizontalGap > this.config.wordDistanceThreshold) || 
            (currStartT > 0 && prevEndT > 0 && timeGap > this.config.wordTimeGapThreshold);

          if (isNewWord) {
            lineWords.push({
              characters: currentWord,
              boundingBox: this.getGroupBoundingBox(currentWord.map(c => c.boundingBox))
            });
            currentWord = [curr];
          } else {
            currentWord.push(curr);
          }
        }

        lineWords.push({
          characters: currentWord,
          boundingBox: this.getGroupBoundingBox(currentWord.map(c => c.boundingBox))
        });
      }

      if (lineWords.length > 0) {
        segmentedLines.push({
          words: lineWords,
          boundingBox: this.getGroupBoundingBox(lineWords.map(w => w.boundingBox))
        });
      }
    }

    // 5. Paragraph grouping (evaluating line spacing height ratios and horizontal indent shifts)
    const paragraphs: SegmentedParagraph[] = [];
    if (segmentedLines.length > 0) {
      let currentParagraph: SegmentedLine[] = [segmentedLines[0]!];

      for (let i = 1; i < segmentedLines.length; i++) {
        const prev = segmentedLines[i - 1]!;
        const curr = segmentedLines[i]!;

        const verticalGap = curr.boundingBox.y - (prev.boundingBox.y + prev.boundingBox.height);
        
        // Horizontal indentation check
        const isIndented = Math.abs(curr.boundingBox.x - prev.boundingBox.x) > 60;
        
        const isNewParagraph = 
          (verticalGap > this.config.paragraphSpacingThreshold) || 
          (verticalGap > 40 && isIndented);

        if (isNewParagraph) {
          paragraphs.push({
            lines: currentParagraph,
            boundingBox: this.getGroupBoundingBox(currentParagraph.map(l => l.boundingBox))
          });
          currentParagraph = [curr];
        } else {
          currentParagraph.push(curr);
        }
      }

      paragraphs.push({
        lines: currentParagraph,
        boundingBox: this.getGroupBoundingBox(currentParagraph.map(l => l.boundingBox))
      });
    }

    return { paragraphs };
  }

  private getStrokeBoundingBox(stroke: Stroke2D): BoundingBox {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pt of stroke) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    const x = minX === Infinity ? 0 : minX;
    const y = minY === Infinity ? 0 : minY;
    const w = minX === Infinity ? 0 : maxX - minX;
    const h = minY === Infinity ? 0 : maxY - minY;
    return { x, y, width: w, height: h };
  }

  private getGroupBoundingBox(boxes: BoundingBox[]): BoundingBox {
    if (boxes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const b of boxes) {
      if (b.x < minX) minX = b.x;
      if (b.x + b.width > maxX) maxX = b.x + b.width;
      if (b.y < minY) minY = b.y;
      if (b.y + b.height > maxY) maxY = b.y + b.height;
    }
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private mergeBoundingBoxes(b1: BoundingBox, b2: BoundingBox): BoundingBox {
    const minX = Math.min(b1.x, b2.x);
    const maxX = Math.max(b1.x + b1.width, b2.x + b2.width);
    const minY = Math.min(b1.y, b2.y);
    const maxY = Math.max(b1.y + b1.height, b2.y + b2.height);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private getIntersectionOverMinArea(b1: BoundingBox, b2: BoundingBox): number {
    const box1 = {
      x: b1.x,
      y: b1.y,
      w: Math.max(1, b1.width),
      h: Math.max(1, b1.height)
    };
    const box2 = {
      x: b2.x,
      y: b2.y,
      w: Math.max(1, b2.width),
      h: Math.max(1, b2.height)
    };

    const interX = Math.max(box1.x, box2.x);
    const interY = Math.max(box1.y, box2.y);
    const interW = Math.max(0, Math.min(box1.x + box1.w, box2.x + box2.w) - interX);
    const interH = Math.max(0, Math.min(box1.y + box1.h, box2.y + box2.h) - interY);
    const interArea = interW * interH;
    
    if (interArea === 0) return 0;
    
    const a1 = box1.w * box1.h;
    const a2 = box2.w * box2.h;
    return interArea / Math.min(a1, a2);
  }
}
