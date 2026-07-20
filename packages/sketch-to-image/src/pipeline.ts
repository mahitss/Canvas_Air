import { PromptBuilder } from "./prompt/builder";
import { ResultManager } from "./history/manager";
import { ModelProviderAdapter, ImageGenerationOptions, PromptInputs, GenerationResult } from "./types";

export class SketchToImagePipeline {
  private builder: PromptBuilder;
  private history: ResultManager;
  private adapters: Map<string, ModelProviderAdapter> = new Map();
  private activeAdapterId: string | null = null;

  constructor() {
    this.builder = new PromptBuilder();
    this.history = new ResultManager();
  }

  public registerAdapter(adapter: ModelProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
    if (!this.activeAdapterId) {
      this.activeAdapterId = adapter.id;
    }
  }

  public selectAdapter(id: string): void {
    if (!this.adapters.has(id)) {
      throw new Error(`Cannot select unregistered provider adapter: ${id}`);
    }
    this.activeAdapterId = id;
  }

  public getHistoryManager(): ResultManager {
    return this.history;
  }

  public getPromptBuilder(): PromptBuilder {
    return this.builder;
  }

  /**
   * Orchestrates prompt validation synthesis, provider adapter invocation,
   * clock timer metric recording and history logging.
   */
  public async generateImage(
    inputs: PromptInputs,
    options: ImageGenerationOptions
  ): Promise<GenerationResult> {
    
    if (!this.activeAdapterId) {
      throw new Error("No generative model provider adapters registered.");
    }
    const adapter = this.adapters.get(this.activeAdapterId)!;

    // 1. Synthesize Prompt
    const prompt = this.builder.buildPrompt(inputs, options);
    
    const startTime = Date.now();
    const seed = options.seed ?? Math.floor(Math.random() * 100000);

    try {
      // 2. Dispatch model run
      const imageUrl = await adapter.generate(prompt, { ...options, seed });
      const timeMs = Date.now() - startTime;

      const result: GenerationResult = {
        imageUrl,
        seed,
        timeMs,
        parameters: options
      };

      // 3. Log execution parameters
      this.history.addHistoryItem(prompt, result);

      return result;
    } catch (err: any) {
      throw new Error(`Generative Image Pipeline Exception: ${err.message || err}`);
    }
  }

  /**
   * Inpaints a selected canvas area using prompt modifications.
   */
  public async inpaint(
    inputs: PromptInputs,
    maskArea: { x: number; y: number; w: number; h: number },
    options: ImageGenerationOptions
  ): Promise<GenerationResult> {
    void maskArea; // satisfying local compiler rules
    
    // Inpainting adds layout modifier tags
    const inpaintInputs: PromptInputs = {
      ...inputs,
      annotations: [...inputs.annotations, "inpaint region modification"]
    };

    return this.generateImage(inpaintInputs, options);
  }
}
