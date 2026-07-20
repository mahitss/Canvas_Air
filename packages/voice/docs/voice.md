# VisionCanvas AI: Voice Command & Natural Language SDK Documentation

The **Voice Command & Natural Language Engine** (`@visioncanvas/voice`) provides hands-free controls inside VisionCanvas AI. It parses microphone transcript data, evaluates intent categories (drawing, editing, system commands) using phonetic heuristic regex matchers, extracts entities (colors, brushes, export formats), and executes registered commands.

---

## 1. System Pipeline Architecture

```
                       +-----------------------------------+
                       |           VoiceManager            |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |         SpeechRecognizer          |
                       | (Browser Speech API / simulator)  |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          IntentEngine             |
                       |    (English / Hindi parser)       |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |        CommandDispatcher          |
                       |   (Dispatches action events)      |
                       +-----------------------------------+
```

---

## 2. Intent Rules matching heuristics

Intents are mapped using optimized regex strings:
*   **Drawing**: Matches shapes (`circle`, `square`, `triangle`, `line`) triggered by actions (`draw`, `create`, `make`).
    *   *Hindi fallback*: Matches `बनाओ` (e.g. `गोला बनाओ`).
*   **Brush Control**: Identifies brush types (`neon`, `laser`, `pen`, `pencil`) triggered by actions (`change brush`, `brush`).
*   **System Actions**: Processes saving formats (`export as SVG`, `save project`) and grid settings.
