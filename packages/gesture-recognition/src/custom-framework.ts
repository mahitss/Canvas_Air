import { HandPresence } from "@visioncanvas/hand-tracking";
import { ICustomGestureFramework } from "./interfaces";
import { CustomGestureDefinition, GestureError } from "./types";

/**
 * Custom Gesture Recognition Framework.
 * Supports dynamic registration, unregistration, threshold customization, and evaluation of user-defined gestures.
 */
export class CustomGestureFramework implements ICustomGestureFramework {
  private readonly gesturesMap: Map<string, CustomGestureDefinition> = new Map();

  /**
   * Registers a custom gesture definition.
   * Throws GestureError if name is invalid or empty.
   */
  public registerGesture(gesture: CustomGestureDefinition): void {
    if (!gesture.name || gesture.name.trim() === "") {
      throw new GestureError("Gesture name cannot be empty", "INVALID_NAME");
    }
    this.gesturesMap.set(gesture.name, {
      ...gesture,
      metadata: { ...gesture.metadata },
      thresholds: { ...gesture.thresholds }
    });
  }

  /**
   * Unregisters/removes a custom gesture by name.
   */
  public removeGesture(name: string): void {
    this.gesturesMap.delete(name);
  }

  /**
   * Lists all currently registered custom gestures.
   */
  public listGestures(): CustomGestureDefinition[] {
    return Array.from(this.gesturesMap.values()).map((g) => ({
      ...g,
      metadata: { ...g.metadata },
      thresholds: { ...g.thresholds }
    }));
  }

  /**
   * Modifies/overrides configuration thresholds of a registered gesture.
   */
  public configureThresholds(name: string, thresholds: Record<string, number>): void {
    const gesture = this.gesturesMap.get(name);
    if (!gesture) {
      throw new GestureError(`Gesture not found: ${name}`, "GESTURE_NOT_FOUND");
    }
    gesture.thresholds = {
      ...gesture.thresholds,
      ...thresholds
    };
  }

  /**
   * Enables or disables a registered custom gesture.
   */
  public setGestureEnabled(name: string, enabled: boolean): void {
    const gesture = this.gesturesMap.get(name);
    if (!gesture) {
      throw new GestureError(`Gesture not found: ${name}`, "GESTURE_NOT_FOUND");
    }
    gesture.enabled = enabled;
  }

  /**
   * Evaluates active enabled gestures against hand tracking state.
   * Returns names of all matched gestures.
   */
  public evaluate(hand: HandPresence, history: HandPresence[]): string[] {
    const matched: string[] = [];

    for (const [name, gesture] of this.gesturesMap.entries()) {
      if (!gesture.enabled) {
        continue;
      }
      try {
        if (gesture.match(hand, history, gesture.thresholds)) {
          matched.push(name);
        }
      } catch (err) {
        // Safe context: catch user match errors and ignore to keep pipeline running
      }
    }

    return matched;
  }
}
