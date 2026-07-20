import { ITtsProvider, TtsSpeechOptions } from "../interfaces";

/**
 * Default TTS Provider wrapping the Web Speech Synthesis API.
 * Includes fallback logic to mock speech playbacks inside headless/testing pipelines.
 */
export class DefaultTtsProvider implements ITtsProvider {
  private synth: SpeechSynthesis | null = null;
  private isInitialized = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (typeof window !== "undefined" && typeof (window as any).speechSynthesis !== "undefined") {
      this.synth = (window as any).speechSynthesis;
    }
    this.isInitialized = true;
  }

  public async getAvailableVoices(): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error("TTS provider is not initialized.");
    }
    if (!this.synth) {
      // Headless / Test mock voices
      return ["Mock Voice Male", "Mock Voice Female", "Mock Voice Hindi"];
    }

    const voices = this.synth.getVoices();
    return voices.map(v => v.name);
  }

  public async speak(text: string, options?: TtsSpeechOptions): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("TTS provider is not initialized.");
    }

    const rate = options?.rate ?? 1.0;
    const pitch = options?.pitch ?? 1.0;
    const volume = options?.volume ?? 1.0;
    const targetVoiceName = options?.voice;

    // Browser real TTS execution
    if (this.synth) {
      this.synth.cancel(); // Stop active voices

      return new Promise<void>((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = Math.max(0.5, Math.min(2.0, rate));
        utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));
        utterance.volume = Math.max(0.0, Math.min(1.0, volume));

        const voices = this.synth!.getVoices();
        if (targetVoiceName) {
          const selected = voices.find(v => v.name === targetVoiceName);
          if (selected) utterance.voice = selected;
        }

        utterance.onend = () => {
          resolve();
        };

        utterance.onerror = (e) => {
          reject(new Error(`Speech synthesis utterance error: ${e.error}`));
        };

        this.synth!.speak(utterance);
      });
    } else {
      // Mock Node.js simulated player: delay proportional to text length and speech rate
      const durationMs = Math.max(50, (text.length * 40) / rate);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, durationMs);
      });
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}
