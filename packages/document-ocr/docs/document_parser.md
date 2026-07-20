# Document Parser Specifications

This document describes the structured file parser layouts and page regional coordinate extractions implemented in the `DocumentParser` class inside the `@visioncanvas/document-ocr` package.

---

## 1. Supported Document Input Formats
* **Native**: Decodes standard JSON VisionCanvas schema representations.
* **PDF**: Parses document pages, layouts, dimensions (612x792 pt letter size), and header/body text blocks.
* **Images (PNG/JPEG)**: Coordinates layout fallbacks.

---

## 2. Document Hierarchy Models
1. **Pages**: Defined by sequence numbering and width/height dimensions.
2. **Regions**: Structural divisions within pages categorizing semantic roles (`header`, `footer`, `body`, `sidebar`).
3. **Blocks**: The smallest leaf nodes containing character contents (`text`, `tables`, `form-fields`).
4. **Metadata**: Stoves file counts, total page sizes, and title configurations.
