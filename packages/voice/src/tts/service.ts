import { ITextToSpeechService, ITtsProvider, TtsSpeechOptions } from "../interfaces";
import { DefaultTtsProvider } from "./provider";

interface SpeechRequest {
  text: string;
  options?: TtsSpeechOptions | undefined;
  resolve: () => void;
  reject: (err: Error) => void;
}

/**
 * TextToSpeechService manages a FIFO queue of speech requests,
 * supporting sequential playback, rate/pitch options, and immediate interruption.
 */
export class TextToSpeechService implements ITextToSpeechService {
  private provider: ITtsProvider | null = null;
  private queue: SpeechRequest[] = [];
  private isProcessing = false;


  constructor(provider?: ITtsProvider) {
    this.provider = provider || new DefaultTtsProvider();
    this.provider.initialize();
  }

  public setProvider(provider: ITtsProvider): void {
    this.stop();
    this.provider = provider;
    this.provider.initialize();
  }

  public getProvider(): ITtsProvider | null {
    return this.provider;
  }

  /**
   * Play speech immediately. If interrupt option is true, stops current execution and flushes queue.
   */
  public async speak(text: string, options?: TtsSpeechOptions): Promise<void> {
    if (!this.provider) {
      throw new Error("Speech provider is not configured.");
    }

    if (options?.interrupt) {
      this.stop(); // Stops provider, flushes queue
    }

    return new Promise<void>((resolve, reject) => {
      const request: SpeechRequest = { text, resolve, reject };
      if (options !== undefined) {
        request.options = options;
      }
      this.queue.push(request);
      this.processQueue();
    });
  }

  /**
   * Queues speech request to play sequentially (FIFO).
   */
  public async queueSpeech(text: string, options?: TtsSpeechOptions): Promise<void> {
    return this.speak(text, { ...options, interrupt: false });
  }

  /**
   * Stop active speech playback and clear pending FIFO queue.
   */
  public stop(): void {
    this.queue = [];
    this.isProcessing = false;

    if (this.provider) {
      this.provider.stop();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const request = this.queue.shift();
    if (!request) {
      this.isProcessing = false;
      return;
    }



    try {
      if (this.provider) {
        await this.provider.speak(request.text, request.options);
      }
      request.resolve();
    } catch (err) {
      request.reject(err instanceof Error ? err : new Error("Text-to-speech execution failed."));
    } finally {

      this.isProcessing = false;
      // Trigger processing next queue item asynchronously
      setTimeout(() => this.processQueue(), 10);
    }
  }
}
