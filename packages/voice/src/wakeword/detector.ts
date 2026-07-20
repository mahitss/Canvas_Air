import { IWakeWordDetector } from "../interfaces";

/**
 * WakeWordDetector handles configurable wake-word detection, continuous speech scanning,
 * false-positive mitigation using sliding window Levenshtein distances, and customizable sensitivity.
 */
export class WakeWordDetector implements IWakeWordDetector {
  private wakeWord = "hey canvas";
  private sensitivity = 0.80; // similarity ratio threshold (0.0 to 1.0)

  constructor(wakeWord?: string, sensitivity?: number) {
    if (wakeWord) this.wakeWord = wakeWord.toLowerCase().trim();
    if (sensitivity !== undefined) this.sensitivity = sensitivity;
  }

  public setWakeWord(word: string): void {
    this.wakeWord = word.toLowerCase().trim();
  }

  public getWakeWord(): string {
    return this.wakeWord;
  }

  public setSensitivity(value: number): void {
    if (value < 0 || value > 1) {
      throw new Error("Sensitivity must be between 0.0 and 1.0.");
    }
    this.sensitivity = value;
  }

  public getSensitivity(): number {
    return this.sensitivity;
  }

  /**
   * Scans an incremental speech transcript to detect the wake word.
   * Employs token sliding windows and Levenshtein distance checks for fuzzy mitigation.
   */
  public detect(transcript: string): boolean {
    const cleanTranscript = transcript.toLowerCase().trim();
    if (!cleanTranscript || !this.wakeWord) return false;

    // Fast path: exact substring match
    if (cleanTranscript.includes(this.wakeWord)) {
      return true;
    }

    // Sliding window token match
    const targetTokens = this.wakeWord.split(/\s+/);
    const transcriptTokens = cleanTranscript.split(/\s+/);

    if (transcriptTokens.length < targetTokens.length) {
      // Evaluate single token distance if transcript contains just one word
      const dist = this.levenshtein(cleanTranscript, this.wakeWord);
      const similarity = 1 - dist / Math.max(cleanTranscript.length, this.wakeWord.length);
      return similarity >= this.sensitivity;
    }

    const windowSize = targetTokens.length;

    // Slide window across tokens list
    for (let i = 0; i <= transcriptTokens.length - windowSize; i++) {
      const windowTokens = transcriptTokens.slice(i, i + windowSize);
      const windowStr = windowTokens.join(" ");

      const dist = this.levenshtein(windowStr, this.wakeWord);
      const similarity = 1 - dist / Math.max(windowStr.length, this.wakeWord.length);

      if (similarity >= this.sensitivity) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculates Levenshtein Distance between two strings.
   */
  private levenshtein(s1: string, s2: string): number {
    const track = Array(s2.length + 1).fill(null).map(() =>
      Array(s1.length + 1).fill(null)
    );

    for (let i = 0; i <= s1.length; i++) {
      const row = track[0];
      if (row) row[i] = i;
    }
    for (let j = 0; j <= s2.length; j++) {
      const row = track[j];
      if (row) row[0] = j;
    }

    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        const rowCurr = track[j];
        const rowPrev = track[j - 1];

        if (rowCurr && rowPrev) {
          const valLeft = rowCurr[i - 1];
          const valTop = rowPrev[i];
          const valDiag = rowPrev[i - 1];

          if (valLeft !== null && valTop !== null && valDiag !== null) {
            rowCurr[i] = Math.min(
              valLeft + 1,        // deletion
              valTop + 1,         // insertion
              valDiag + indicator // substitution
            );
          }
        }
      }
    }

    const lastRow = track[s2.length];
    if (lastRow) {
      const result = lastRow[s1.length];
      return result !== null ? result : Math.max(s1.length, s2.length);
    }
    return Math.max(s1.length, s2.length);
  }
}
