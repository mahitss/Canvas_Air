import { IFileAdapter } from "../interfaces";
import { VisionCanvasDoc, CanvasObject } from "../domain";

export class SvgFileAdapter implements IFileAdapter {
  public readonly supportedExtensions = ["svg"];

  public async importFile(data: ArrayBuffer | string): Promise<VisionCanvasDoc> {
    const rawString = typeof data === "string" ? data : new TextDecoder().decode(data);
    
    // Extract metadata block
    const metaMatch = rawString.match(/<!--\s*vcanvas-meta:\s*([\s\S]*?)\s*-->/);
    if (!metaMatch || !metaMatch[1]) {
      throw new Error("SvgImportError: Embedded VisionCanvas metadata comment block not found inside SVG");
    }

    return JSON.parse(metaMatch[1]);
  }

  public async exportFile(doc: VisionCanvasDoc): Promise<ArrayBuffer | string> {
    const width = doc.canvas.width;
    const height = doc.canvas.height;
    const bgColor = doc.canvas.backgroundColor;

    let svgLines = [
      `<?xml version="1.0" encoding="UTF-8" standalone="no"?>`,
      `<!-- vcanvas-meta: ${JSON.stringify(doc)} -->`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background-color: ${bgColor}">`
    ];

    // Group elements by layers to preserve layer hierarchy
    for (const layer of doc.layers) {
      svgLines.push(`  <g id="${layer.id}" name="${layer.name}" opacity="${layer.opacity}" style="display: ${layer.visible ? "inline" : "none"}">`);
      
      const layerObjects = doc.objects.filter((obj) => obj.layerId === layer.id);
      for (const obj of layerObjects) {
        svgLines.push(this.objectToSvgElement(obj));
      }

      svgLines.push(`  </g>`);
    }

    svgLines.push(`</svg>`);
    return svgLines.join("\n");
  }

  private objectToSvgElement(obj: CanvasObject): string {
    switch (obj.type) {
      case "stroke": {
        if (obj.points.length === 0) return "";
        const pathData = obj.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        return `    <path d="${pathData}" fill="none" stroke="${obj.color}" stroke-width="${obj.brushWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
      }
      case "shape": {
        const fill = obj.fill ? `fill="${obj.fill}"` : 'fill="none"';
        const transform = obj.transform && obj.transform.length > 0 ? `transform="matrix(${obj.transform.join(",")})"` : "";
        
        if (obj.shapeType === "circle") {
          return `    <circle cx="0" cy="0" r="10" ${fill} stroke="${obj.strokeColor}" stroke-width="${obj.strokeWidth}" ${transform} />`;
        } else if (obj.shapeType === "rect") {
          return `    <rect x="0" y="0" width="50" height="50" ${fill} stroke="${obj.strokeColor}" stroke-width="${obj.strokeWidth}" ${transform} />`;
        } else {
          return `    <line x1="0" y1="0" x2="10" y2="10" stroke="${obj.strokeColor}" stroke-width="${obj.strokeWidth}" ${transform} />`;
        }
      }
      case "text": {
        return `    <text x="${obj.x}" y="${obj.y}" font-size="${obj.fontSize}" font-family="${obj.fontFamily}" fill="${obj.color}">${obj.content}</text>`;
      }
    }
  }
}
