import { SpeechTranscript, VoiceCommandResult, VoiceEngineConfig } from "./types";
import { SpeechRecognizer } from "./speech/recognizer";
import { IntentEngine } from "./intent/engine";
import { CommandDispatcher } from "./dispatcher/dispatcher";
import { DEFAULT_VOICE_CONFIG } from "./config";
import { AudioRingBuffer } from "./audio/buffer";

export class VoiceManager {
  private config: VoiceEngineConfig;
  private recognizer: SpeechRecognizer;
  private intentEngine: IntentEngine;
  private dispatcher: CommandDispatcher;
  
  private history: VoiceCommandResult[] = [];
  
  // Optimizations: Pre-allocated circular buffer and prediction cache
  private audioBuffer = new AudioRingBuffer(16384);
  private predictionCache: Map<string, VoiceCommandResult> = new Map();
  private maxCacheSize = 250;

  // Noise gate threshold: values below this level bypass parsing pipelines
  private noiseGateFloor = 0.008;

  constructor(config: VoiceEngineConfig = DEFAULT_VOICE_CONFIG) {
    this.config = config;
    this.recognizer = new SpeechRecognizer(config.defaultLanguage);
    this.intentEngine = new IntentEngine();
    this.dispatcher = new CommandDispatcher();
  }

  public setConfig(config: VoiceEngineConfig): void {
    this.config = config;
  }

  public getDispatcher(): CommandDispatcher {
    return this.dispatcher;
  }

  public getIntentEngine(): IntentEngine {
    return this.intentEngine;
  }

  public getHistory(): VoiceCommandResult[] {
    return this.history;
  }

  /**
   * Ingests a raw PCM float array chunk into the pre-allocated AudioRingBuffer.
   */
  public ingestAudio(chunk: Float32Array): void {
    this.audioBuffer.write(chunk);
  }

  public getAudioBuffer(): AudioRingBuffer {
    return this.audioBuffer;
  }

  public setNoiseGateFloor(value: number): void {
    this.noiseGateFloor = value;
  }

  public getNoiseGateFloor(): number {
    return this.noiseGateFloor;
  }

  /**
   * Starts listening to speech input streams.
   */
  public startListening(
    onCommandDispatched?: (result: VoiceCommandResult) => void,
    onError?: (err: any) => void
  ): void {
    this.recognizer.startListening(
      (transcriptObj: SpeechTranscript) => {
        const result = this.processTranscript(transcriptObj.transcript, transcriptObj.confidence);
        if (onCommandDispatched) {
          onCommandDispatched(result);
        }
      },
      (err: any) => {
        if (onError) onError(err);
      }
    );
  }

  /**
   * Stops listening to speech inputs.
   */
  public stopListening(): void {
    this.recognizer.stopListening();
  }

  /**
   * Parses transcripts, validates confidence, and routes actions.
   * Utilizes prediction caching and noise-gating optimizations.
   */
  public processTranscript(text: string, confidence: number): VoiceCommandResult {
    const startTime = performance.now();
    const cleanText = text.toLowerCase().trim();

    // 1. Adaptive processing check: Skip parsing on silent periods if input level is gated
    const currentAudioLevel = this.audioBuffer.calculateRMS();
    // If the buffer is active but falls below the noise gate floor, suppress parsing
    if (this.audioBuffer.size() > 0 && currentAudioLevel < this.noiseGateFloor) {
      return {
        intent: "unknown",
        entities: {},
        rawTranscript: text,
        confidence: 0.0,
        executionTimeMs: performance.now() - startTime
      };
    }

    // 2. Prediction Cache lookup: return cached results on incremental speech stream hits
    const cachedHit = this.predictionCache.get(cleanText);
    if (cachedHit) {
      return {
        ...cachedHit,
        executionTimeMs: performance.now() - startTime // Return instant execution metrics
      };
    }

    // 3. Fallback confidence pruning
    if (confidence < this.config.sensitivityThreshold) {
      const result: VoiceCommandResult = {
        intent: "unknown",
        entities: {},
        rawTranscript: text,
        confidence,
        executionTimeMs: performance.now() - startTime
      };
      return result;
    }

    const parsed = this.intentEngine.parseCommand(text);

    // Route actions if registered handlers match
    this.dispatcher.dispatch(parsed.intent, parsed.entities);

    const duration = performance.now() - startTime;

    const commandResult: VoiceCommandResult = {
      intent: parsed.intent,
      entities: parsed.entities,
      rawTranscript: text,
      confidence,
      executionTimeMs: duration
    };

    // Cache lookup updates
    if (this.predictionCache.size >= this.maxCacheSize) {
      // Evict oldest item
      const firstKey = this.predictionCache.keys().next().value;
      if (firstKey !== undefined) {
        this.predictionCache.delete(firstKey);
      }
    }
    this.predictionCache.set(cleanText, commandResult);

    // Store in history
    this.history.push(commandResult);

    return commandResult;
  }

  /**
   * Clears active prediction caches.
   */
  public clearCache(): void {
    this.predictionCache.clear();
  }

  /**
   * Directly triggers simulation inputs inside tests.
   */
  public simulateVoiceInput(
    text: string,
    confidence: number,
    onCommandDispatched?: (result: VoiceCommandResult) => void
  ): void {
    this.recognizer.simulateSpeech(text, confidence, (transcriptObj) => {
      const result = this.processTranscript(transcriptObj.transcript, transcriptObj.confidence);
      if (onCommandDispatched) {
        onCommandDispatched(result);
      }
    });
  }
}
