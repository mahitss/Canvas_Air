import { TextRegion, LayoutSegment, SegmentType } from "../types";

export class LayoutAnalyzer {
  private segmentSpacingThreshold = 50;

  /**
   * Identifies paragraphs, headings, columns, headers, footers, lists, and reading order
   * out of bounding coordinates text regions.
   */
  public analyzeLayout(regions: TextRegion[]): LayoutSegment[] {
    if (regions.length === 0) return [];

    // Reading order: Sort regions primarily by Y-coordinate, secondary by X-coordinate
    const sorted = [...regions].sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) < 15) {
        return a.x - b.x;
      }
      return yDiff;
    });

    const segments: LayoutSegment[] = [];
    let currentSegmentId = 0;
    let currentSegmentRegions: TextRegion[] = [];

    for (const curr of sorted) {
      if (currentSegmentRegions.length === 0) {
        currentSegmentRegions.push(curr);
        continue;
      }

      const prev = currentSegmentRegions[currentSegmentRegions.length - 1]!;
      const deltaY = curr.y - (prev.y + prev.h);

      if (deltaY < this.segmentSpacingThreshold) {
        currentSegmentRegions.push(curr);
      } else {
        segments.push(this.buildSegment(`seg-${currentSegmentId++}`, currentSegmentRegions));
        currentSegmentRegions = [curr];
      }
    }

    if (currentSegmentRegions.length > 0) {
      segments.push(this.buildSegment(`seg-${currentSegmentId++}`, currentSegmentRegions));
    }

    // Heuristics mapping for multi-column documents
    for (let i = 0; i < segments.length; i++) {
      const segA = segments[i]!;
      for (let j = i + 1; j < segments.length; j++) {
        const segB = segments[j]!;
        const yOverlap = Math.max(0, Math.min(segA.y + segA.h, segB.y + segB.h) - Math.max(segA.y, segB.y));
        const xSeparated = Math.abs(segA.x - segB.x) > 200;
        if (yOverlap > 20 && xSeparated) {
          segA.type = "column";
          segB.type = "column";
        }
      }
    }

    return segments;
  }

  private buildSegment(id: string, segmentRegions: TextRegion[]): LayoutSegment {
    const minX = Math.min(...segmentRegions.map(r => r.x));
    const minY = Math.min(...segmentRegions.map(r => r.y));
    const maxX = Math.max(...segmentRegions.map(r => r.x + r.w));
    const maxY = Math.max(...segmentRegions.map(r => r.y + r.h));

    const content = segmentRegions.map(r => r.text).join(" ").trim();
    const averageHeight = segmentRegions.reduce((sum, r) => sum + r.h, 0) / segmentRegions.length;
    
    // Heuristic segment classification
    let type: SegmentType = "paragraph";

    if (minY < 80 && averageHeight > 30) {
      type = "heading";
    } else if (minY < 80) {
      type = "header";
    } else if (minY > 900) {
      type = "footer";
    } else if (content.startsWith("-") || content.startsWith("*") || /^\d+\./.test(content)) {
      type = "list";
    } else if (averageHeight > 24) {
      type = "heading";
    }

    return {
      id,
      type,
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
      content
    };
  }
}
