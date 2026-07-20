import { BrushType } from "../brush/brush_engine";
import { GpuParticleType } from "../particle/gpu_particles";

export interface AdaptiveOutcome {
  brushToUse: BrushType;
  particlesToSpawn?: GpuParticleType;
  spawnCount: number;
}

export class AdaptiveEffectsEngine {
  /**
   * Modulates VFX presets dynamically based on kinematics speed.
   */
  public evaluateAdaptiveAction(speed: number, gesture?: string): AdaptiveOutcome {
    if (gesture === "Circle") {
      return {
        brushToUse: "Galaxy",
        particlesToSpawn: "Energy",
        spawnCount: 50
      };
    }

    if (speed > 300) {
      // Quick swipe -> Laser brush and particle burst
      return {
        brushToUse: "Laser",
        particlesToSpawn: "Fire",
        spawnCount: 30
      };
    }

    // Default slow draw -> Neon brush
    return {
      brushToUse: "Neon",
      spawnCount: 0
    };
  }
}
export * from "../brush/brush_engine";
export * from "../particle/gpu_particles";
export * from "../physics/brush_physics";
export * from "../shaders/shader_library";
