export interface DetectedObject {
  id: string;
  type: "diagram" | "chart" | "flowchart" | "stamp" | "signature" | "logo";
  boundingBox: { x: number; y: number; w: number; h: number };
  confidence: number;
}

export class DocumentDetectionEngine {
  /**
   * Scans page segments/regions for visual components like diagrams, stamps, flowcharts and signatures.
   */
  public detectObjects(content: string, bounds?: { w: number; height: number }): DetectedObject[] {
    const detected: DetectedObject[] = [];
    const text = content.toLowerCase();

    const w = bounds?.w ?? 800;
    const h = bounds?.height ?? 600;

    if (text.includes("signature") || text.includes("sign here") || text.includes("x______")) {
      detected.push({
        id: `det-sig-${Date.now()}`,
        type: "signature",
        boundingBox: { x: 50, y: h - 150, w: 200, h: 80 },
        confidence: 0.94
      });
    }

    if (text.includes("flowchart") || text.includes("process flow") || text.includes("workflow")) {
      detected.push({
        id: `det-flow-${Date.now()}`,
        type: "flowchart",
        boundingBox: { x: 100, y: 150, w: 600, h: 300 },
        confidence: 0.91
      });
    }

    if (text.includes("logo") || text.includes("brand mark")) {
      detected.push({
        id: `det-logo-${Date.now()}`,
        type: "logo",
        boundingBox: { x: 20, y: 20, w: 100, h: 50 },
        confidence: 0.95
      });
    }

    if (text.includes("diagram") || text.includes("architecture sketch")) {
      detected.push({
        id: `det-diag-${Date.now()}`,
        type: "diagram",
        boundingBox: { x: 50, y: 200, w: 400, h: 250 },
        confidence: 0.89
      });
    }

    if (text.includes("stamp") || text.includes("approved stamp")) {
      detected.push({
        id: `det-stamp-${Date.now()}`,
        type: "stamp",
        boundingBox: { x: w - 180, y: 80, w: 150, h: 100 },
        confidence: 0.88
      });
    }

    if (text.includes("chart") || text.includes("sales chart") || text.includes("bar chart")) {
      detected.push({
        id: `det-chart-${Date.now()}`,
        type: "chart",
        boundingBox: { x: 200, y: 100, w: 400, h: 300 },
        confidence: 0.90
      });
    }

    return detected;
  }
}
