import { FormatRegistry } from "../registry/format_registry";
import { VisionCanvasDoc } from "../domain";
import { CanonicalDocumentModelManager } from "../document/model";
import { InvalidDocumentException } from "../errors";

export interface ImportResult {
  document: VisionCanvasDoc;
  warnings: string[];
}

export class ImportPipeline {
  constructor(private readonly registry: FormatRegistry) {}

  /**
   * Processes a file import through registration lookup, parser execution, and upgrades.
   * Recovers from partial element corruption failures by logging warnings.
   */
  public async importFile(
    fileName: string,
    data: ArrayBuffer | string
  ): Promise<ImportResult> {
    // Path traversal audit check
    if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      throw new Error("SecurityError: Path traversal attempts detected");
    }

    const warnings: string[] = [];

    // 1. Identify format extension and lookup adapter
    const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    const extension = extMatch ? extMatch[1]! : "json";
    
    const adapter = this.registry.lookupAdapter(extension);

    // 2. Parse data to object format
    let doc: VisionCanvasDoc;
    try {
      doc = await adapter.importFile(data);
    } catch (err: any) {
      throw new InvalidDocumentException([`Format parsing failed: ${err.message}`]);
    }

    // 3. Partial failure recovery: sanitize and filter corrupted canvas objects
    const cleanObjects = [];
    if (doc && Array.isArray(doc.objects)) {
      for (const obj of doc.objects) {
        if (!obj || !obj.id || !obj.type) {
          warnings.push(`Skipped corrupted object: ${JSON.stringify(obj)}`);
          continue;
        }
        if (obj.type === "stroke" && (!Array.isArray((obj as any).points) || (obj as any).points.length === 0)) {
          warnings.push(`Skipped empty stroke object: '${obj.id}'`);
          continue;
        }
        cleanObjects.push(obj);
      }
    }

    // Build sanitized doc
    const sanitizedDoc: VisionCanvasDoc = {
      ...doc,
      objects: cleanObjects
    };

    // 4. Schema version upgrade migrations (backward compatibility)
    const upgradedDoc = CanonicalDocumentModelManager.upgrade(sanitizedDoc);

    // 5. Schema validation
    const validationErrors = CanonicalDocumentModelManager.validate(upgradedDoc);
    if (validationErrors.length > 0) {
      // If critical structure parameters are missing (e.g. metadata or dimensions), throw exception
      const criticalErrors = validationErrors.filter(
        (err) => err.includes("metadata") || err.includes("canvas") || err.includes("ID")
      );
      if (criticalErrors.length > 0) {
        throw new InvalidDocumentException(validationErrors);
      }
      
      // Treat minor validations (e.g. object-level checks) as warnings
      warnings.push(...validationErrors);
    }

    // 6. Deep freeze to guarantee immutability
    const finalDoc = CanonicalDocumentModelManager.deepFreeze(upgradedDoc);

    return {
      document: finalDoc,
      warnings
    };
  }
}
