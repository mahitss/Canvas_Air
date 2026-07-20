# VisionCanvas AI: Document Intelligence & OCR SDK Documentation

The **Document Intelligence & OCR Platform** (`@visioncanvas/document-ocr`) extracts and structures characters layout segments, cells matrices, form label-inputs, and named entities from canvas documents.

---

## 1. System Pipeline Architecture

```
                       +-----------------------------------+
                       |        DocumentOCREngine          |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |         LayoutAnalyzer          |
                       | (Heading, paragraph segmenter)    |
                       +--------+--------+--------+--------+
                                |        |        |
            +-------------------+        |        +-------------------+
            |                            |                            |
            v                            v                            v
  +------------------+         +------------------+         +------------------+
  |   TableEngine    |         |    FormEngine    |         |  EntityExtractor |
  | (Cell alignment) |         | (Label-Value pair)|         | (Regex entities) |
  +------------------+         +------------------+         +------------------+
```

---

## 2. Table and Form Mapping Logic

*   **Table Cell Alignments**: Bounding box cells are mapped onto columns and rows if spatial deviations fall within range:
    $$\operatorname{Col}(C_i) = \{ C_j \mid |X(C_i) - X(C_j)| < 40 \}$$
    $$\operatorname{Row}(C_i) = \{ C_j \mid |Y(C_i) - Y(C_j)| < 20 \}$$
*   **Form Pairs**: Identifies text regions ending in colons `:` and checks for adjacent values to the right within $120\text{px}$ proximity.

---

## 3. Entity Classification Filters

Named values are identified using standard regex lookups:
*   **Email**: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
*   **Date**: `\b\d{4}[-/.]\d{2}[-/.]\d{2}\b`
*   **Amount**: `(?:\$|£|€|₹)\s?\d+(?:[.,]\d{2})?`
