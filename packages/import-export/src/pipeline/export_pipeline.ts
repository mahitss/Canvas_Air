import { FormatRegistry } from "../registry/format_registry";
import { VisionCanvasDoc } from "../domain";
import { InvalidDocumentException } from "../errors";

export interface ExportOptions {
  format: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export class ExportPipeline {
  constructor(private readonly registry: FormatRegistry) {}

  /**
   * Dispatches document state to target adapter format.
   * Supports progress notification callbacks and cancellation tokens.
   */
  public async exportFile(
    doc: VisionCanvasDoc,
    options: ExportOptions
  ): Promise<ArrayBuffer | string> {
    const { format, onProgress, signal } = options;

    if (signal?.aborted) {
      throw new Error("ExportCancelled: Process aborted by client signal");
    }

    // 1. Resolve adapter
    onProgress?.(10);
    const adapter = this.registry.lookupAdapter(format);

    if (signal?.aborted) {
      throw new Error("ExportCancelled: Process aborted by client signal");
    }

    // 2. Validate document state pre-export
    onProgress?.(30);
    if (!doc || !doc.id || !doc.metadata) {
      throw new InvalidDocumentException(["Pre-export verification failed: Document elements are null"]);
    }

    if (signal?.aborted) {
      throw new Error("ExportCancelled: Process aborted by client signal");
    }

    // 3. Perform conversion
    onProgress?.(60);
    const data = await adapter.exportFile(doc);

    if (signal?.aborted) {
      throw new Error("ExportCancelled: Process aborted by client signal");
    }

    // 4. Output finalization
    onProgress?.(100);
    return data;
  }
}
