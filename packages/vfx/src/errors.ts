/**
 * Base domain exception representing a Visual Effects simulation failure.
 */
export class VfxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VfxError";
    Object.setPrototypeOf(this, VfxError.prototype);
  }
}

/**
 * Exception raised when the particle allocation limits are exceeded.
 */
export class EmitterAllocationError extends VfxError {
  constructor(message: string) {
    super(message);
    this.name = "EmitterAllocationError";
    Object.setPrototypeOf(this, EmitterAllocationError.prototype);
  }
}

/**
 * Exception raised when an requested preset cannot be resolved.
 */
export class PresetResolutionError extends VfxError {
  constructor(message: string) {
    super(message);
    this.name = "PresetResolutionError";
    Object.setPrototypeOf(this, PresetResolutionError.prototype);
  }
}
