import { SupportedLanguage } from "../types";

export class LanguageModel {
  private enVocabulary: string[] = [
    "hello", "canvas", "project", "writing", "vision",
    "air", "paint", "hand", "gesture", "drawing", "shape",
    "math", "editor", "vector", "screen", "collaboration"
  ];

  private hiVocabulary: string[] = [
    "नमस्ते", "स्वागत", "कनक", "कलम", "कमल", "जल", "घर",
    "भारत", "चित्र", "अक्षर", "भाषा", "हवा", "हाथ"
  ];

  /**
   * Compares input word spelling against vocabulary list and returns best corrected suggestion.
   */
  public spellCheck(word: string, lang: SupportedLanguage): string {
    const vocab = lang === "en" ? this.enVocabulary : this.hiVocabulary;
    const lowerWord = word.toLowerCase();

    // Word matches directly
    if (vocab.includes(lowerWord)) {
      return word;
    }

    let minDistance = Infinity;
    let bestMatch = word;

    for (const vocabWord of vocab) {
      const distance = this.getLevenshteinDistance(lowerWord, vocabWord.toLowerCase());
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = vocabWord;
      }
    }

    // Return correction only if similarity is high (max edit distance is 3 or length/2)
    if (minDistance <= Math.max(3, Math.floor(word.length / 2))) {
      return bestMatch;
    }

    return word;
  }

  /**
   * Returns autocomplete recommendations starting with prefix sequence.
   */
  public getPredictions(prefix: string, lang: SupportedLanguage): string[] {
    const vocab = lang === "en" ? this.enVocabulary : this.hiVocabulary;
    const lowerPrefix = prefix.toLowerCase();
    
    if (!lowerPrefix) return [];

    return vocab.filter(w => w.toLowerCase().startsWith(lowerPrefix));
  }

  private getLevenshteinDistance(s: string, t: string): number {
    const m = s.length;
    const n = t.length;

    // dp matrix grid setup
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i]![0] = i;
    for (let j = 0; j <= n; j++) dp[0]![j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1;
        dp[i]![j] = Math.min(
          dp[i - 1]![j]! + 1,        // Deletion
          dp[i]![j - 1]! + 1,        // Insertion
          dp[i - 1]![j - 1]! + cost  // Substitution
        );
      }
    }

    return dp[m]![n]!;
  }
}
