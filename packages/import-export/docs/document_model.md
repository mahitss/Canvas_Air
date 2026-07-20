# Canonical VisionCanvas Document Model Documentation

This document describes the canonical document model for the **VisionCanvas** platform, implemented in the `@visioncanvas/import-export` package.

---

## 1. Schema Versioning & Backward Compatibility

The document format is designed to be extensible and backward compatible. The metadata segment stores a `schemaVersion` number to manage formatting iterations.

### Version Transition Rules:
* **Schema Version 1**:
  * Original format without mandatory `layerId` and `zIndex` properties on individual vector strokes/shapes.
* **Schema Version 2 (Current Host)**:
  * Extends the elements format to mandate `layerId` and `zIndex` to enable rich layer sorting.
  * During import, documents with `schemaVersion: 1` are automatically upgraded via `CanonicalDocumentModelManager.upgrade()`, defaulting missing elements to `"default-layer"` and `zIndex: 0`.

---

## 2. Immutability

To prevent side-effects in rendering and undo/redo loops:
* All document elements and arrays are typed as `Readonly` and `ReadonlyArray`.
* The `CanonicalDocumentModelManager.deepFreeze()` method recursive-freezes the document structure to trap program mutations during development.

---

## 3. Structure Specifications

### JSON Structure Outline:
```json
{
  "id": "doc_unique_uuid",
  "metadata": {
    "title": "Diagram Sketch",
    "author": "Author Name",
    "createdAt": 1784322908562,
    "updatedAt": 1784322908562,
    "schemaVersion": 2
  },
  "canvas": {
    "width": 1920,
    "height": 1080,
    "backgroundColor": "#ffffff"
  },
  "layers": [
    { "id": "layer-1", "name": "Background", "visible": true, "opacity": 1, "zIndex": 0 }
  ],
  "objects": [
    {
      "id": "stroke-1",
      "type": "stroke",
      "layerId": "layer-1",
      "zIndex": 1,
      "points": [{ "x": 10, "y": 20, "pressure": 0.8 }],
      "color": "#000000",
      "brushWidth": 5
    }
  ],
  "assets": [],
  "history": {
    "baseVersion": 1,
    "patchSequence": 15,
    "checkpointTimestamp": 1784322908562
  }
}
```
