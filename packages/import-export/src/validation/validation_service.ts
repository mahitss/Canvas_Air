import { VisionCanvasDoc } from "../domain";

export class DocumentValidationService {
  /**
   * Performs deep verification checks on schemas, layers references, assets mimetype properties, and metadata bounds.
   */
  public static validateDocument(doc: VisionCanvasDoc): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Core properties validation
    if (!doc.id) errors.push("Missing document ID reference");
    if (!doc.metadata) {
      errors.push("Missing document metadata container");
    } else {
      if (!doc.metadata.title) errors.push("Metadata: Title cannot be blank");
      if (!doc.metadata.author) errors.push("Metadata: Author cannot be blank");
    }

    // 2. Layer references validation
    const layerIds = new Set(doc.layers.map((l) => l.id));
    for (const obj of doc.objects) {
      if (!obj.layerId) {
        errors.push(`Object '${obj.id}' has undefined layerId reference`);
      } else if (!layerIds.has(obj.layerId)) {
        errors.push(`ReferenceConflict: Object '${obj.id}' references non-existent layer '${obj.layerId}'`);
      }
    }

    // 3. Assets checking
    if (Array.isArray(doc.assets)) {
      for (const asset of doc.assets) {
        if (asset.sizeBytes <= 0) {
          errors.push(`Asset '${asset.id}' size bounds are invalid: ${asset.sizeBytes} bytes`);
        }
        if (!asset.mimeType.startsWith("image/") && !asset.mimeType.startsWith("video/")) {
          errors.push(`Asset '${asset.id}' has unsupported mimeType: '${asset.mimeType}'`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export class MetadataManager {
  /**
   * Merges and creates updated metadata snapshots, preserving original creation times.
   */
  public static updateMetadata(
    original: { createdAt: number; title: string; author: string; schemaVersion: number },
    updates: { title?: string; author?: string; customProperties?: Record<string, any> }
  ): any {
    return {
      title: updates.title ?? original.title,
      author: updates.author ?? original.author,
      createdAt: original.createdAt,
      updatedAt: Date.now(),
      schemaVersion: original.schemaVersion,
      customProperties: updates.customProperties
    };
  }
}
