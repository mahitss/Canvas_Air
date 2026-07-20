import { describe, it, expect } from "vitest";
import { AI_ORCHESTRATOR_TOKENS } from "../src/di";
import { AiOrchestratorError, ProviderRoutingError } from "../src/errors";

describe("AI Orchestrator Clean Architecture Verification", () => {
  it("should define unique dependency injection Symbols", () => {
    expect(AI_ORCHESTRATOR_TOKENS.AiOrchestrator).toBe(Symbol.for("IAiOrchestrator"));
    expect(AI_ORCHESTRATOR_TOKENS.AiEngineRouter).toBe(Symbol.for("IAiEngineRouter"));
  });

  it("should extend base error prototype for custom error classes", () => {
    const error = new ProviderRoutingError("Routing failure");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AiOrchestratorError);
    expect(error.name).toBe("ProviderRoutingError");
  });
});
