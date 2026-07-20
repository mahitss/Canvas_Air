export class DocumentIntelligenceException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

export class DocumentParserException extends DocumentIntelligenceException {
  constructor(reason: string) {
    super(`DocumentParserError: File parsing failed: ${reason}`);
  }
}

export class OCRProviderException extends DocumentIntelligenceException {
  constructor(reason: string) {
    super(`OCRProviderError: Character extraction failed: ${reason}`);
  }
}

export class IntelligencePlatformException extends DocumentIntelligenceException {
  constructor(reason: string) {
    super(`PlatformError: Document extraction service exception: ${reason}`);
  }
}
