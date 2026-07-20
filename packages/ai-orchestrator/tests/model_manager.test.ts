import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { AiModelManager } from "../src/integration/model_manager";

describe("AiModelManager Specific Target Config & Routing Tests", () => {
  const backupOpenRouter = process.env.OPENROUTER_API_KEY;
  const backupGemini = process.env.GEMINI_API_KEY;
  const backupMain = process.env.MAIN_MODEL;
  const backupReasoning = process.env.REASONING_MODEL;
  const backupFallback = process.env.FALLBACK_MODEL;
  const backupFast = process.env.FAST_MODEL;
  const backupStructured = process.env.STRUCTURED_MODEL;
  const backupLegacyGemini = process.env.GEMINI_MODELS;
  const backupLegacyOpenRouter = process.env.OPENROUTER_MODELS;

  beforeAll(() => {
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    // Set model configs
    process.env.MAIN_MODEL = "google/gemma-3-27b-it:free";
    process.env.REASONING_MODEL = "deepseek/deepseek-r1:free";
    process.env.FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
    process.env.FAST_MODEL = "mistralai/mistral-7b-instruct:free";
    process.env.STRUCTURED_MODEL = "qwen/qwen-2.5-72b-instruct:free";
  });

  afterAll(() => {
    process.env.OPENROUTER_API_KEY = backupOpenRouter;
    process.env.GEMINI_API_KEY = backupGemini;
    process.env.MAIN_MODEL = backupMain;
    process.env.REASONING_MODEL = backupReasoning;
    process.env.FALLBACK_MODEL = backupFallback;
    process.env.FAST_MODEL = backupFast;
    process.env.STRUCTURED_MODEL = backupStructured;
    process.env.GEMINI_MODELS = backupLegacyGemini;
    process.env.OPENROUTER_MODELS = backupLegacyOpenRouter;
  });

  it("should fail validation if all API keys are missing at startup", () => {
    process.env.OPENROUTER_API_KEY = "";
    process.env.GEMINI_API_KEY = "";

    expect(() => new AiModelManager()).toThrow(
      "[AiModelManager] Startup validation failed: Both GEMINI_API_KEY and OPENROUTER_API_KEY are missing."
    );

    // restore
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    process.env.GEMINI_API_KEY = "test-gemini-key";
  });

  it("should resolve primary model configurations correctly for each task", () => {
    const manager = new AiModelManager();

    expect(manager.getPrimaryModelForTask("chat")).toBe("google/gemma-3-27b-it:free");
    expect(manager.getPrimaryModelForTask("reasoning")).toBe("deepseek/deepseek-r1:free");
    expect(manager.getPrimaryModelForTask("fast")).toBe("mistralai/mistral-7b-instruct:free");
    expect(manager.getPrimaryModelForTask("structured")).toBe("qwen/qwen-2.5-72b-instruct:free");
    expect(manager.getFallbackModel()).toBe("meta-llama/llama-3.3-70b-instruct:free");
  });

  it("should run primary model completions and failover to fallback model on primary crashes", async () => {
    const manager = new AiModelManager();

    // Normal execution
    const resChat = await manager.executeCompletion("Hello world", "chat");
    expect(resChat).toContain("google/gemma-3-27b-it:free");

    const resReasoning = await manager.executeCompletion("Solve complex math", "reasoning");
    expect(resReasoning).toContain("deepseek/deepseek-r1:free");

    // Failover execution
    const resFail = await manager.executeCompletion("fail-trigger", "chat");
    expect(resFail).toContain("meta-llama/llama-3.3-70b-instruct:free"); // fallback model
  });

  it("should parse legacy models variables for backward compatibility automatic migrations", () => {
    // Clear modern model vars
    process.env.MAIN_MODEL = "";
    process.env.REASONING_MODEL = "";
    process.env.FALLBACK_MODEL = "";
    process.env.FAST_MODEL = "";
    process.env.STRUCTURED_MODEL = "";

    // Set legacy config strings
    process.env.GEMINI_MODELS = "google/gemma-3-12b-it:free";
    process.env.OPENROUTER_MODELS = "deepseek/deepseek-r1:free,meta-llama/llama-3.3-70b-instruct:free,qwen/qwen-2.5-72b-instruct:free,mistralai/mistral-7b-instruct:free";

    const manager = new AiModelManager();
    expect(manager.getPrimaryModelForTask("chat")).toBe("google/gemma-3-12b-it:free");
    expect(manager.getPrimaryModelForTask("reasoning")).toBe("deepseek/deepseek-r1:free");
    expect(manager.getFallbackModel()).toBe("meta-llama/llama-3.3-70b-instruct:free");
    expect(manager.getPrimaryModelForTask("structured")).toBe("qwen/qwen-2.5-72b-instruct:free");
    expect(manager.getPrimaryModelForTask("fast")).toBe("mistralai/mistral-7b-instruct:free");

    // Restore modern configs
    process.env.MAIN_MODEL = "google/gemma-3-27b-it:free";
    process.env.REASONING_MODEL = "deepseek/deepseek-r1:free";
    process.env.FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
    process.env.FAST_MODEL = "mistralai/mistral-7b-instruct:free";
    process.env.STRUCTURED_MODEL = "qwen/qwen-2.5-72b-instruct:free";
  });

  it("should output diagnostic logs for chosen model in development mode", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const manager = new AiModelManager();

    await manager.executeCompletion("Hello diagnostic log", "chat");
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AiModelManager] Selected model google/gemma-3-27b-it:free for task type "chat"')
    );

    infoSpy.mockRestore();
  });
});
