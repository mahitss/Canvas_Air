# VisionCanvas AI: Handwriting & Air Text Recognition SDK Documentation

The **Handwriting & Air Text Recognition Engine** (`@visioncanvas/handwriting`) acts as the continuous text-input generator for VisionCanvas AI. It parses raw drawing strokes, classifies them into letters, numbers, symbols, or multilingual Hindi words, performs spell-checking, autocompletes prefixes, and manages interactive text editors.

---

## 1. System Pipeline Architecture

```
                       +-----------------------------------+
                       |    HandwritingRecognitionEngine   |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |         StrokeAnalyzer            |
                       |    (Loops, crossings, dimensions) |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          OcrClassifier            |
                       |  (English / Devanagari templates) |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          LanguageModel            |
                       | (Levenshtein distances lookup)    |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |            MathParser             |
                       |   (Translates frames to LaTeX)    |
                       +-----------------------------------+
```

---

## 2. Levenshtein Spell Correction Distance

For any classified handwritten word $W$, similarities against vocabulary targets are computed using dynamic programming cells:

$$D(i, j) = \min \begin{cases} D(i-1, j) + 1 \\ D(i, j-1) + 1 \\ D(i-1, j-1) + \text{cost} \end{cases}$$

Candidate strings with minimum distance are swapped dynamically to correct spelling errors.

---

## 3. LaTeX Math Layout Parsing

Handwritten equations are converted to LaTeX format:
*   **Fractions**: Identifies vertical coordinate overlaps of symbols situated above and below horizontal division bars.
*   **Exponents**: Maps relative superscript positioning offsets ($y_{\text{exponent}} < y_{\text{base}}$).
