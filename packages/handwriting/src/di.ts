export const HANDWRITING_TOKENS = {
  HandwritingEngine: Symbol.for("IHandwritingEngine"),
  Segmenter: Symbol.for("IHandwritingSegmenter"),
  Classifier: Symbol.for("IHandwritingClassifier"),
  Spellchecker: Symbol.for("IHandwritingSpellchecker"),
  MathParser: Symbol.for("IMathExpressionParser"),
  SymbolClassifier: Symbol.for("ISymbolClassifier"),
  EventBus: Symbol.for("IHandwritingEventBus"),
  LanguageManager: Symbol.for("ILanguageManager"),
  ConfidenceService: Symbol.for("IHandwritingConfidenceService")
};
