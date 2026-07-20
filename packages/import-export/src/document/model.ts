import { VisionCanvasDoc, DocumentMetadata } from "../domain";
import { CompatibilityException } from "../errors";

export const HOST_SCHEMA_VERSION = 2;

export class CanonicalDocumentModelManager {
  /**
   * Freezes document state object and all its arrays/children to maintain absolute immutability.
   */
  public static deepFreeze(doc: VisionCanvasDoc): VisionCanvasDoc {
    const freezeObj = (obj: any): any => {
      if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
        Object.freeze(obj);
        for (const key of Object.keys(obj)) {
          freezeObj(obj[key]);
        }
      }
      return obj;
    };
    return freezeObj(doc);
  }

  /**
   * Validates document fields against constraints, returning errors list.
   */
  public static validate(doc: VisionCanvasDoc): string[] {
    const errors: string[] = [];

    if (!doc.id) errors.push("Missing document ID");
    if (!doc.metadata) {
      errors.push("Missing document metadata");
    } else {
      if (!doc.metadata.title) errors.push("Metadata: title is required");
      if (!doc.metadata.author) errors.push("Metadata: author is required");
      if (typeof doc.metadata.schemaVersion !== "number") errors.push("Metadata: schemaVersion must be a number");
    }

    if (!doc.canvas) {
      errors.push("Missing canvas dimensions");
    } else {
      if (doc.canvas.width <= 0 || doc.canvas.height <= 0) {
        errors.push("Canvas width and height must be positive numbers");
      }
    }

    if (!Array.isArray(doc.layers)) {
      errors.push("Layers must be an array");
    } else {
      for (const layer of doc.layers) {
        if (!layer.id || !layer.name) {
          errors.push(`Layer properties check failed: ${JSON.stringify(layer)}`);
        }
      }
    }

    if (!Array.isArray(doc.objects)) {
      errors.push("Objects must be an array");
    } else {
      for (const obj of doc.objects) {
        if (!obj.id || !obj.type || !obj.layerId) {
          errors.push(`Object properties check failed: ${JSON.stringify(obj)}`);
        }
        if (obj.type === "stroke" && (!Array.isArray((obj as any).points) || (obj as any).points.length === 0)) {
          errors.push(`Stroke object '${obj.id}' must contain coordinates points`);
        }
      }
    }

    return errors;
  }

  /**
   * Adapts and upgrades older version schemas to the current host version schema,
   * guaranteeing backward compatibility.
   */
  public static upgrade(doc: VisionCanvasDoc): VisionCanvasDoc {
    const version = doc.metadata.schemaVersion;
    if (version > HOST_SCHEMA_VERSION) {
      throw new CompatibilityException(version, HOST_SCHEMA_VERSION);
    }

    if (version === HOST_SCHEMA_VERSION) {
      return doc;
    }

    // Clone to perform mutation
    const upgradedMetadata: DocumentMetadata = {
      ...doc.metadata,
      schemaVersion: HOST_SCHEMA_VERSION
    };

    // Schema version 1 -> 2 migration:
    // Ensure all objects have a default layerId and zIndex
    const upgradedObjects = doc.objects.map((obj) => {
      return {
        ...obj,
        layerId: obj.layerId || "default-layer",
        zIndex: obj.zIndex ?? 0
      };
    });

    const upgradedDoc: VisionCanvasDoc = {
      ...doc,
      metadata: upgradedMetadata,
      objects: upgradedObjects
    };

    return upgradedDoc;
  }
}
