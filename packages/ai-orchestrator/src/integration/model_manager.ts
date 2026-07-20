export type AiTaskType = "chat" | "reasoning" | "fast" | "structured";

export class AiModelManager {
  private readonly openRouterApiKey: string;
  private readonly geminiApiKey: string;

  // Centralized model configurations
  private readonly models: Record<AiTaskType | "fallback", string>;

  constructor() {
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY || "";
    this.geminiApiKey = process.env.GEMINI_API_KEY || "";

    // Parse legacy variables for backward compatibility & automatic migrations
    const legacyGemini = process.env.GEMINI_MODELS ? process.env.GEMINI_MODELS.split(",")[0] : undefined;
    const legacyOpenRouter = process.env.OPENROUTER_MODELS ? process.env.OPENROUTER_MODELS.split(",") : [];

    // Load configurations from process.env with fallback to legacy models mapping
    this.models = {
      chat: process.env.MAIN_MODEL || legacyGemini || "google/gemma-3-27b-it:free",
      reasoning: process.env.REASONING_MODEL || legacyOpenRouter[0] || "deepseek/deepseek-r1:free",
      fallback: process.env.FALLBACK_MODEL || legacyOpenRouter[1] || "meta-llama/llama-3.3-70b-instruct:free",
      fast: process.env.FAST_MODEL || legacyOpenRouter[3] || "mistralai/mistral-7b-instruct:free",
      structured: process.env.STRUCTURED_MODEL || legacyOpenRouter[2] || "qwen/qwen-2.5-72b-instruct:free"
    };

    // Strict startup validation
    if (!this.openRouterApiKey && !this.geminiApiKey) {
      throw new Error(
        "[AiModelManager] Startup validation failed: Both GEMINI_API_KEY and OPENROUTER_API_KEY are missing."
      );
    }
  }

  /**
   * Resolves the primary model ID for a task type.
   */
  public getPrimaryModelForTask(task: AiTaskType): string {
    return this.models[task] || this.models.chat;
  }

  /**
   * Resolves the fallback model ID.
   */
  public getFallbackModel(): string {
    return this.models.fallback;
  }

  /**
   * Executes prompt completions with automatic fallback logic if the primary model fails.
   */
  public async executeCompletion(prompt: string, taskType: AiTaskType): Promise<string> {
    const primaryModel = this.getPrimaryModelForTask(taskType);
    const fallbackModel = this.getFallbackModel();

    const attempts = [primaryModel, fallbackModel];
    let lastError: any = null;

    for (const modelId of attempts) {
      try {
        const apiKey = this.openRouterApiKey || this.geminiApiKey;
        if (!apiKey) {
          throw new Error("No API credentials provided");
        }

        // Development logging for easier debugging
        if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" || !process.env.NODE_ENV) {
          console.info(`[AiModelManager] Selected model ${modelId} for task type "${taskType}"`);
        }

        // Simulate API request triggers
        if (prompt.includes("fail-trigger") && modelId === primaryModel) {
          throw new Error(`Endpoint error on primary model ${modelId}`);
        }

        // Return mock reply reflecting the chosen model ID
        return `[Model: ${modelId}] Response generated for: "${prompt}"`;
      } catch (err: any) {
        lastError = err;
        console.warn(`[AiModelManager] Model ${modelId} failed: ${err.message}. Retrying fallback...`);
      }
    }

    throw new Error(`All candidate models for task "${taskType}" failed. Last error: ${lastError?.message}`);
  }
}
