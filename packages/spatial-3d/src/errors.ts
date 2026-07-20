export class SpatialComputingException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

export class SpatialSessionException extends SpatialComputingException {
  constructor(reason: string) {
    super(`SpatialSessionError: Session transaction failed: ${reason}`);
  }
}

export class CoordinateEngineException extends SpatialComputingException {
  constructor(reason: string) {
    super(`CoordinateError: Mathematical transform failed: ${reason}`);
  }
}

export class AnchorException extends SpatialComputingException {
  constructor(reason: string) {
    super(`AnchorError: Spatial anchoring failed: ${reason}`);
  }
}

export class DeviceException extends SpatialComputingException {
  constructor(reason: string) {
    super(`DeviceError: Hardware connectivity failed: ${reason}`);
  }
}
