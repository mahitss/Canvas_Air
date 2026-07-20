import { describe, it, expect } from "vitest";
import { VFX_TOKENS } from "../src/di";
import { VfxError, EmitterAllocationError, PresetResolutionError } from "../src/errors";

describe("Visual Effects & Particle Engine Architecture Verification", () => {
  it("should declare unique and valid dependency injection token symbols", () => {
    const tokens = Object.values(VFX_TOKENS);
    const tokenSet = new Set(tokens);
    
    // Tokens count must be correct and unique
    expect(tokens.length).toBe(5);
    expect(tokenSet.size).toBe(5);

    expect(VFX_TOKENS.ParticleSystem.description).toBe("IParticleSystem");
    expect(VFX_TOKENS.EffectManager.description).toBe("IEffectManager");
  });

  it("should preserve proper JavaScript prototype chain inheritance for exceptions", () => {
    const baseErr = new VfxError("base error");
    expect(baseErr).toBeInstanceOf(Error);
    expect(baseErr).toBeInstanceOf(VfxError);
    expect(baseErr.name).toBe("VfxError");
    expect(baseErr.message).toBe("base error");

    const allocErr = new EmitterAllocationError("allocation error");
    expect(allocErr).toBeInstanceOf(Error);
    expect(allocErr).toBeInstanceOf(VfxError);
    expect(allocErr).toBeInstanceOf(EmitterAllocationError);
    expect(allocErr.name).toBe("EmitterAllocationError");

    const resolutionErr = new PresetResolutionError("resolution error");
    expect(resolutionErr).toBeInstanceOf(Error);
    expect(resolutionErr).toBeInstanceOf(VfxError);
    expect(resolutionErr).toBeInstanceOf(PresetResolutionError);
    expect(resolutionErr.name).toBe("PresetResolutionError");
  });
});
