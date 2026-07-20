import { SpeechTranscript } from "../types";

export class SpeechRecognizer {
  private recognition: any = null;
  private isListening: boolean = false;
  private defaultLanguage: string = "en-US";

  constructor(language: "en" | "hi" = "en") {
    this.defaultLanguage = language === "hi" ? "hi-IN" : "en-US";
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    // Check if running inside browser window context holding Web Speech API
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognitionAPI) {
        this.recognition = new SpeechRecognitionAPI();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = this.defaultLanguage;
      }
    }
  }

  /**
   * Starts listening to audio input streams.
   */
  public startListening(
    onResult: (result: SpeechTranscript) => void,
    onError: (err: any) => void
  ): void {
    if (this.isListening) return;

    if (this.recognition) {
      this.recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        if (result && result[0]) {
          onResult({
            transcript: result[0].transcript,
            confidence: result[0].confidence
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        onError(event.error);
      };

      try {
        this.recognition.start();
        this.isListening = true;
      } catch (err) {
        onError(err);
      }
    } else {
      // Node fallback mode
      this.isListening = true;
    }
  }

  /**
   * Stops listening to audio inputs.
   */
  public stopListening(): void {
    if (!this.isListening) return;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Suppress errors on redundant stops
      }
    }
    this.isListening = false;
  }

  /**
   * Triggered in unit tests to simulate speech ingestion.
   */
  public simulateSpeech(
    text: string, 
    confidence: number,
    onResult: (result: SpeechTranscript) => void
  ): void {
    if (this.isListening) {
      onResult({ transcript: text, confidence });
    }
  }
}
export * from "../types";
export * from "../config";
