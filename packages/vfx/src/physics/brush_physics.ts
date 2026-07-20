export interface HandKinematics {
  velocity: { x: number; y: number; z: number };
  acceleration: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  gestureStrength: number;
  smoothness: number;
}

export class BrushPhysicsEngine {
  /**
   * Translates kinematics parameters to modulate rendering attributes (e.g., width, opacity).
   */
  public resolveRenderingModifiers(kinematics: HandKinematics): { widthMultiplier: number; opacity: number } {
    const speed = Math.hypot(kinematics.velocity.x, kinematics.velocity.y, kinematics.velocity.z);

    // Fast movement -> thin laser line; slow movement -> thicker smooth lines
    const rawWidth = Math.max(0.5, 4.0 - speed * 0.01);
    const widthMultiplier = rawWidth * (1.0 + kinematics.gestureStrength * 0.5);

    // Speed increases emission glowing opacity
    const opacity = Math.min(1.0, 0.4 + speed * 0.002 + kinematics.smoothness * 0.2);

    return {
      widthMultiplier,
      opacity
    };
  }
}
