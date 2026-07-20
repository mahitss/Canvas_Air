# VisionCanvas AI: AI Sketch-to-Image SDK Documentation

The **AI Sketch-to-Image Generation Pipeline** (`@visioncanvas/sketch-to-image`) translates rough freehand canvas sketches and prompts into high-quality generated images using modular provider adapters.

---

## 1. System Pipeline Architecture

```
                       +-----------------------------------+
                       |      SketchToImagePipeline        |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          PromptBuilder            |
                       |  (Aesthetic prompts compiler)     |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |      ModelProviderAdapter         |
                       |  (Generative model adapters)      |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          ResultManager            |
                       | (Parameters history archiver)     |
                       +-----------------------------------+
```

---

## 2. Prompt Synthesis Modifiers

The prompt builder aggregates shapes, annotations, and style options to assemble descriptive model instruction strings:
$$\text{Final Prompt} = \text{StylePrefix} + \left( \sum S_i \right) + \left( \sum A_i \right) + \text{DefaultAestheticModifiers}$$

---

## 3. Provider Adapters

All generation calls decouple from vendor specifics using the `ModelProviderAdapter` interface. Developers register custom local/cloud models (ONNX, PyTorch, OpenAI) by matching execution formats.
