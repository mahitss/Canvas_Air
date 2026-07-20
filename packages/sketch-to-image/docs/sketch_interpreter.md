# Sketch Interpreter Specifications

This document describes the structured scene representation output format created by the `SketchInterpreter` inside the `@visioncanvas/sketch-to-image` package.

---

## 1. Input Specifications
* **Strokes**: Array of coordinate coordinate sequences with brush widths and colors.
* **Shapes**: Extracted geometry blocks with classification types (e.g. circle, rectangle).
* **Handwriting**: Recognized text array.
* **Diagram Metadata**: (Optional) Details concerning topological connections.

---

## 2. Extraction & Representation Output
1. **Stroke Density Score**: An average points count per stroke to assess drawing details level.
2. **Normalized Coordinates**: Shape boxes are normalized to non-negative bounds.
3. **Annotations text**: Handwritings are compiled to tag summaries.
4. **Diagram Summary**: Describes diagram structural metadata parameters.
